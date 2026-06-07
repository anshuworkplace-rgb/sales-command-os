import { supabase } from '../lib/supabase';

export const leadService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*, profiles(name, color, avatar)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getLead(id) {
    const { data, error } = await supabase
      .from('leads')
      .select('*, profiles(name, color, avatar)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createLead(leadData) {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLead(id, updates, expectedVersion = null) {
    const updateData = { ...updates };
    const query = supabase.from('leads').update(updateData).eq('id', id);

    if (expectedVersion !== null && expectedVersion !== undefined) {
      updateData.version = Number(expectedVersion) + 1;
      query.eq('version', expectedVersion);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('VERSION_CONFLICT');
    }
    return data[0];
  },

  async updateStatus(id, newStatus, expectedVersion = null) {
    const updateData = { status: newStatus };
    const query = supabase.from('leads').update(updateData).eq('id', id);

    if (expectedVersion !== null && expectedVersion !== undefined) {
      updateData.version = Number(expectedVersion) + 1;
      query.eq('version', expectedVersion);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('VERSION_CONFLICT');
    }
    return data[0];
  },

  async updateRevenue(id, amount, expectedVersion = null) {
    const { data: lead } = await supabase.from('leads').select('revenue, version').eq('id', id).single();
    const currentRev = Number(lead?.revenue || 0);
    const currentVer = lead?.version || 1;
    
    const updateData = { revenue: currentRev + Number(amount) };
    const query = supabase.from('leads').update(updateData).eq('id', id);

    const verToCheck = expectedVersion !== null && expectedVersion !== undefined ? expectedVersion : currentVer;
    updateData.version = Number(verToCheck) + 1;
    query.eq('version', verToCheck);

    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('VERSION_CONFLICT');
    }
    return data[0];
  },

  async updateFollowUp(id, newDate, nextStep = null, followUpNote = null, expectedVersion = null) {
    const updateData = { next_follow_up: newDate };
    if (nextStep !== null) updateData.next_step = nextStep;
    if (followUpNote !== null) updateData.follow_up_note = followUpNote;

    const query = supabase.from('leads').update(updateData).eq('id', id);

    if (expectedVersion !== null && expectedVersion !== undefined) {
      updateData.version = Number(expectedVersion) + 1;
      query.eq('version', expectedVersion);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('VERSION_CONFLICT');
    }
    return data[0];
  },

  async deleteLead(id) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getActivities(leadId) {
    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles(name, avatar)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllActivities(limit = 30) {
    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles(name, avatar)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async addNote(leadId, userId, text) {
    const { data, error } = await supabase
      .from('activities')
      .insert([{
        lead_id: leadId,
        performed_by: userId,
        type: 'note_added',
        description: text
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Upsert by phone number — for Google Sheets sync deduplication.
   * If a lead with the same phone exists, update it. Otherwise, insert.
   */
  async upsertByPhone(leadData) {
    const phone = leadData.phone?.replace(/[^\d]/g, '').slice(-10);
    if (!phone || phone.length < 7) throw new Error('Invalid phone');

    // Check for existing lead with same phone
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      const { data, error } = await supabase
        .from('leads')
        .update({ ...leadData, phone, last_sheet_sync_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .single();
      if (error) throw error;
      return { action: 'updated', data };
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...leadData, phone, last_sheet_sync_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return { action: 'inserted', data };
    }
  }
};
