import { supabase } from '../lib/supabase';

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign up a new user
   */
  async signUp(email, password, name, role = 'sales') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        }
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current active session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Fetch full profile for a user ID (and auto-create if missing)
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    
    // Auto-heal: If profile doesn't exist (trigger failed or user created early), create it now
    if (!data) {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (user) {
        const newProfile = {
          id: userId,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
          email: user.email,
          role: user.user_metadata?.role || 'manager', // Default to manager for the first user to allow full access
        };
        
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();
          
        if (insertError) throw insertError;
        return createdProfile;
      }
    }
    
    return data;
  },

  /**
   * Fetch all profiles (for manager views and assignment)
   */
  async getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  /**
   * Update a user's profile (Admin/Manager only)
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
