import { supabase } from '../lib/supabase';

export const taskService = {
  /**
   * Fetch priority queue calling the Postgres function
   */
  async getPriorityQueue(userId, limit = 10) {
    const { data, error } = await supabase
      .rpc('get_priority_queue', { p_user_id: userId, p_limit: limit });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all tasks for a user
   */
  async getTasks(status = 'pending') {
    let query = supabase
      .from('tasks')
      .select('*, leads(name, phone, status)')
      .order('due_at', { ascending: true });
      
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Mark a task as completed
   */
  async completeTask(id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  /**
   * Reschedule a task
   */
  async rescheduleTask(id, newDueDate) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ due_at: newDueDate })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  /**
   * Create a manual task
   */
  async createTask(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};
