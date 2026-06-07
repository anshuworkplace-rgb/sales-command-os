import { supabase } from '../lib/supabase';

export const dealService = {
  /**
   * Fetch all active deals for user
   */
  async getDeals() {
    const { data, error } = await supabase
      .from('deals')
      .select('*, leads(name, phone)')
      .order('value', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  /**
   * Update deal stage
   */
  async updateStage(id, newStage) {
    const { data, error } = await supabase
      .from('deals')
      .update({ stage: newStage })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};
