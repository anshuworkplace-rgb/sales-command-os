import { create } from 'zustand';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

const useUserStore = create((set, get) => ({
  session: null,
  currentUserProfile: null,
  users: [], // All profiles (for managers/assignment)
  monthlyTargets: [], // Custom targets per user per month
  isLoading: true,
  error: null,

  // Initialize auth state
  initAuth: async () => {
    try {
      const session = await authService.getSession();
      set({ session });
      if (session?.user) {
        await get().fetchCurrentUserProfile(session.user.id);
        await get().fetchAllProfiles();
      }
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authService.signIn(email, password);
      set({ session: data.session });
      if (data.user) {
        await get().fetchCurrentUserProfile(data.user.id);
        await get().fetchAllProfiles();
      }
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, name) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authService.signUp(email, password, name);
      
      // If email confirmations are enabled in Supabase, session might be null here
      if (data.session) {
        set({ session: data.session });
        if (data.user) {
          await get().fetchCurrentUserProfile(data.user.id);
          await get().fetchAllProfiles();
        }
      } else {
        throw new Error("Account created! Please check your email to verify before logging in.");
      }
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await authService.signOut();
      set({ session: null, currentUserProfile: null, users: [] });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCurrentUserProfile: async (userId) => {
    try {
      const profile = await authService.getProfile(userId);
      set({ currentUserProfile: profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ error: 'Profile not found in database. Did you create the user before running the SQL script?' });
    }
  },

  fetchAllProfiles: async () => {
    try {
      const profiles = await authService.getAllProfiles();
      set({ users: profiles });
      
      const { data: targets, error } = await supabase
        .from('monthly_targets')
        .select('*');
      if (!error && targets) {
        set({ monthlyTargets: targets });
      }
    } catch (error) {
      console.error('Error fetching all profiles:', error);
    }
  },

  updateProfile: async (userId, updates) => {
    try {
      set({ isLoading: true });
      await authService.updateProfile(userId, updates);
      // Refresh profiles
      await get().fetchAllProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setMonthlyTarget: async (userId, monthStr, targetValue) => {
    try {
      set({ isLoading: true });
      
      // Ensure date format is YYYY-MM-01
      const formattedMonth = monthStr.length === 7 ? `${monthStr}-01` : monthStr;
      
      const { data, error } = await supabase
        .from('monthly_targets')
        .upsert({
          user_id: userId,
          target_month: formattedMonth,
          revenue_target: Number(targetValue),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,target_month'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      set(state => {
        const filtered = state.monthlyTargets.filter(t => !(t.user_id === userId && t.target_month === formattedMonth));
        return { 
          monthlyTargets: [...filtered, data],
          isLoading: false
        };
      });
    } catch (error) {
      console.error('Error setting monthly target:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Helpers for UI components
  getCurrentUser: () => get().currentUserProfile,
  getUserById: (id) => get().users.find((u) => u.id === id),
  getSalesUsers: () => get().users.filter((u) => u.role === 'sales'),
  isManager: () => ['manager', 'admin'].includes(get().currentUserProfile?.role),
  getRepMonthlyTarget: (userId, monthStr) => {
    const targets = get().monthlyTargets || [];
    const cleanMonth = monthStr.substring(0, 7); // 'YYYY-MM'
    const found = targets.find(t => t.user_id === userId && t.target_month.startsWith(cleanMonth));
    if (found) return Number(found.revenue_target);
    
    // Fallback to profile target
    const rep = get().users.find(u => u.id === userId) || get().currentUserProfile;
    return Number(rep?.monthly_target || 150000);
  },
}));

export default useUserStore;
