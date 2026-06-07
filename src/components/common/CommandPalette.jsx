import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Plus, Import, Target, UserRound, ArrowRight, X, ChevronRight,
  CornerDownLeft, Undo2, Award, Users2, ShieldAlert, BadgeAlert, ArrowUpRight,
  Home, Zap, Users, IndianRupee, Brain, Trophy, Settings, FileSpreadsheet,
  Globe, BarChart3, HeartHandshake, Eye
} from 'lucide-react';
import useUIStore from '../../stores/useUIStore';
import useLeadStore from '../../stores/useLeadStore';
import useDealStore from '../../stores/useDealStore';
import useUserStore from '../../stores/useUserStore';
import useToastStore from '../../stores/useToastStore';
import { getPriorityQueue } from '../../utils/pipelineMetrics';

// Icon Map for Dynamic Recent Items Rendering
const ICON_MAP = {
  Home, Zap, Users, IndianRupee, Brain, Trophy, Settings, FileSpreadsheet,
  Globe, BarChart3, HeartHandshake, Plus, Import, Target, UserRound, Award
};

export default function CommandPalette() {
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openAddLead,
    openImport,
    openLeadDetail,
    setActivePage,
    setViewFilter,
    setSearchQuery,
  } = useUIStore();

  const { leads, updateLead } = useLeadStore();
  const { deals, fetchDeals } = useDealStore();
  const { users, setMonthlyTarget, fetchAllProfiles } = useUserStore();
  const { success, error: toastError } = useToastStore();

  // Scoped Wizard States
  // 'default' | 'reassign_lead' | 'reassign_rep' | 'set_target_rep' | 'set_target_val'
  const [screen, setScreen] = useState('default');
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedRep, setSelectedRep] = useState(null);
  const [targetValue, setTargetValue] = useState('');

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState([]);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load Recent Items from LocalStorage
  const loadRecentItems = () => {
    try {
      const items = JSON.parse(localStorage.getItem('salesos_recent_palette') || '[]');
      setRecentItems(items);
    } catch (err) {
      setRecentItems([]);
    }
  };

  const addRecentItem = useCallback((item) => {
    try {
      const existing = JSON.parse(localStorage.getItem('salesos_recent_palette') || '[]');
      const filtered = existing.filter(x => x.id !== item.id || x.type !== item.type);
      const updated = [item, ...filtered].slice(0, 5);
      localStorage.setItem('salesos_recent_palette', JSON.stringify(updated));
      setRecentItems(updated);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Sync state on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setScreen('default');
      setQuery('');
      setSelectedIndex(0);
      setSelectedLead(null);
      setSelectedRep(null);
      setTargetValue('');
      loadRecentItems();
      fetchDeals();
      fetchAllProfiles();
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isCommandPaletteOpen, fetchDeals, fetchAllProfiles]);

  // Keep selected item in view during keyboard navigation
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selected item index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Simple Substring Search Fuzzy Match
  const matches = (source, target) => {
    if (!target) return true;
    return String(source || '').toLowerCase().includes(target.toLowerCase());
  };

  // ─── SCREENS LOGIC ───

  // Screen 1: Default
  const defaultItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Actions / Commands
    const commandsList = [
      {
        id: 'cmd-reassign',
        type: 'action',
        label: 'Reassign a Lead',
        sub: 'Shift lead assignment to another representative',
        iconName: 'Users2',
        action: () => setScreen('reassign_lead'),
      },
      {
        id: 'cmd-target',
        type: 'action',
        label: 'Set Monthly Quota Target',
        sub: 'Update performance target for a rep',
        iconName: 'Award',
        action: () => setScreen('set_target_rep'),
      },
      {
        id: 'cmd-create',
        type: 'action',
        label: 'Create new lead',
        sub: 'Open new client capture form',
        iconName: 'Plus',
        action: () => openAddLead(),
      },
      {
        id: 'cmd-import',
        type: 'action',
        label: 'Import or export leads',
        sub: 'CSV batch tools',
        iconName: 'Import',
        action: () => openImport(),
      },
      {
        id: 'cmd-call',
        type: 'action',
        label: 'Start priority call workflow',
        sub: 'Open high-priority dialer queue',
        iconName: 'Target',
        action: () => setActivePage('today'),
      },
    ].filter(item => matches(item.label, q) || matches(item.sub, q));

    // 2. Navigation Pages
    const pagesList = [
      { id: 'page-home', type: 'page', label: 'Go to Home Dashboard', sub: 'Performance snapshot & metrics', iconName: 'Home', action: () => setActivePage('home') },
      { id: 'page-hub', type: 'page', label: 'Go to Action HUB', sub: 'Your daily priority tasks stream', iconName: 'Zap', action: () => setActivePage('action-hub') },
      { id: 'page-clients', type: 'page', label: 'Go to Clients Table', sub: 'Searchable database of client profiles', iconName: 'Users', action: () => setActivePage('clients') },
      { id: 'page-revenue', type: 'page', label: 'Go to Revenue Command', sub: 'Target vs. Closed revenue stats', iconName: 'IndianRupee', action: () => setActivePage('revenue') },
      { id: 'page-intel', type: 'page', label: 'Go to AI Intel', sub: 'Predictive forecasting & notifications', iconName: 'Brain', action: () => setActivePage('intelligence') },
      { id: 'page-leader', type: 'page', label: 'Go to Leaderboard', sub: 'Team stack ranking & streak metrics', iconName: 'Trophy', action: () => setActivePage('leaderboard') },
      { id: 'page-focus', type: 'page', label: 'Go to Focus Mode', sub: 'Vim-style deep focus workspace', iconName: 'Target', action: () => setActivePage('focus') },
    ].filter(item => matches(item.label, q) || matches(item.sub, q));

    // 3. Leads Search
    const leadsList = leads
      .filter(l => matches(l.name, q) || matches(l.phone, q) || matches(l.city, q) || matches(l.notes, q))
      .slice(0, 5)
      .map(l => ({
        id: `lead-${l.id}`,
        type: 'lead',
        label: l.name || 'Unnamed Client',
        sub: `Lead · ${l.phone || ''} ${l.city ? `· ${l.city}` : ''}`,
        iconName: 'UserRound',
        action: () => {
          openLeadDetail(l.id);
          setActivePage('clients');
        }
      }));

    // 4. Deals Search
    const dealsList = (deals || [])
      .filter(d => matches(d.name, q) || matches(d.stage, q) || matches(d.leads?.name, q))
      .slice(0, 5)
      .map(d => ({
        id: `deal-${d.id}`,
        type: 'deal',
        label: d.name || 'Unnamed Deal',
        sub: `Deal · ₹${Number(d.value || 0).toLocaleString('en-IN')} · ${d.stage?.replace('_', ' ')}`,
        iconName: 'IndianRupee',
        action: () => {
          if (d.lead_id) {
            openLeadDetail(d.lead_id);
            setActivePage('clients');
          }
        }
      }));

    // 5. Representatives Search
    const repsList = users
      .filter(u => matches(u.name, q) || matches(u.role, q))
      .slice(0, 5)
      .map(u => ({
        id: `rep-${u.id}`,
        type: 'rep',
        label: u.name,
        sub: `Sales Representative · ${u.role}`,
        iconName: 'Users',
        action: () => {
          setViewFilter(u.id);
          setActivePage('clients');
        }
      }));

    return {
      commands: commandsList,
      pages: pagesList,
      leads: leadsList,
      deals: dealsList,
      reps: repsList,
      empty: commandsList.length === 0 && pagesList.length === 0 && leadsList.length === 0 && dealsList.length === 0 && repsList.length === 0
    };
  }, [query, leads, deals, users, openAddLead, openImport, setActivePage, openLeadDetail, setViewFilter]);

  // Screen 2: Select Lead for Reassign
  const reassignLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter(l => matches(l.name, q) || matches(l.phone, q))
      .slice(0, 8)
      .map(l => ({
        id: l.id,
        label: l.name || 'Unnamed Client',
        sub: `${l.phone || ''} · status: ${l.status}`,
        iconName: 'UserRound',
        action: () => {
          setSelectedLead({ id: l.id, name: l.name });
          setScreen('reassign_rep');
          setQuery('');
        }
      }));
  }, [query, leads]);

  // Screen 3: Select Rep for Reassign
  const reassignReps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter(u => matches(u.name, q))
      .map(u => ({
        id: u.id,
        label: u.name,
        sub: `Assign to representative`,
        iconName: 'Users',
        action: async () => {
          try {
            await updateLead(selectedLead.id, { assigned_to: u.id });
            success(`Reassigned ${selectedLead.name} to ${u.name}`);
            closeCommandPalette();
          } catch (err) {
            toastError('Failed to reassign lead');
          }
        }
      }));
  }, [query, users, selectedLead, updateLead, success, toastError, closeCommandPalette]);

  // Screen 4: Select Rep for Target
  const targetReps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter(u => matches(u.name, q))
      .map(u => ({
        id: u.id,
        label: u.name,
        sub: `Configure target quota`,
        iconName: 'Users',
        action: () => {
          setSelectedRep({ id: u.id, name: u.name });
          setScreen('set_target_val');
          setQuery('');
        }
      }));
  }, [query, users]);

  // Combined flat items list for current screen index mapping
  const flatItems = useMemo(() => {
    if (screen === 'default') {
      const list = [];
      if (query.trim() === '') {
        recentItems.forEach(item => {
          list.push({
            ...item,
            action: () => {
              // Reconstruct action based on type
              if (item.type === 'page') setActivePage(item.id.replace('page-', ''));
              else if (item.type === 'lead') { openLeadDetail(item.id.replace('lead-', '')); setActivePage('clients'); }
              else if (item.type === 'deal') {
                const dl = deals.find(d => `deal-${d.id}` === item.id);
                if (dl?.lead_id) { openLeadDetail(dl.lead_id); setActivePage('clients'); }
              } else if (item.type === 'action') {
                if (item.id === 'cmd-reassign') setScreen('reassign_lead');
                else if (item.id === 'cmd-target') setScreen('set_target_rep');
                else if (item.id === 'cmd-create') openAddLead();
                else if (item.id === 'cmd-import') openImport();
                else if (item.id === 'cmd-call') setActivePage('today');
              }
            }
          });
        });
      }
      defaultItems.commands.forEach(x => list.push(x));
      defaultItems.pages.forEach(x => list.push(x));
      defaultItems.leads.forEach(x => list.push(x));
      defaultItems.deals.forEach(x => list.push(x));
      defaultItems.reps.forEach(x => list.push(x));
      return list;
    }
    if (screen === 'reassign_lead') return reassignLeads;
    if (screen === 'reassign_rep') return reassignReps;
    if (screen === 'set_target_rep') return targetReps;
    return []; // For target value screen, inputs are free text
  }, [screen, query, recentItems, defaultItems, reassignLeads, reassignReps, targetReps, openAddLead, openImport, setActivePage, openLeadDetail, deals]);

  // ─── ACTION EXECUTION ───
  const runAction = useCallback((item) => {
    if (screen === 'default') {
      addRecentItem({
        id: item.id,
        type: item.type,
        label: item.label,
        sub: item.sub,
        iconName: item.iconName
      });
    }
    item.action();
    if (item.type !== 'action' && screen === 'default') {
      setSearchQuery(query);
      closeCommandPalette();
    }
  }, [screen, query, addRecentItem, closeCommandPalette, setSearchQuery]);

  // Target quota submit handler
  const handleTargetSubmit = async () => {
    if (!targetValue || isNaN(targetValue)) {
      toastError('Please enter a valid target amount');
      return;
    }
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      await setMonthlyTarget(selectedRep.id, currentMonthStr, targetValue);
      success(`Updated monthly target for ${selectedRep.name} to ₹${Number(targetValue).toLocaleString('en-IN')}`);
      closeCommandPalette();
    } catch (err) {
      toastError('Failed to update target quota');
    }
  };

  // Keyboard Navigation Handlers
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
      return;
    }

    if (e.key === 'Backspace' && query === '') {
      if (screen === 'reassign_rep') { e.preventDefault(); setScreen('reassign_lead'); return; }
      if (screen === 'reassign_lead') { e.preventDefault(); setScreen('default'); return; }
      if (screen === 'set_target_val') { e.preventDefault(); setScreen('set_target_rep'); return; }
      if (screen === 'set_target_rep') { e.preventDefault(); setScreen('default'); return; }
    }

    if (screen === 'set_target_val') {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTargetSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        runAction(selected);
      }
    }
  }, [screen, query, flatItems, selectedIndex, selectedRep, targetValue, closeCommandPalette, runAction, handleTargetSubmit]);

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 p-4 pt-[14vh] backdrop-blur-sm"
          onClick={closeCommandPalette}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="app-card-elevated w-full max-w-2xl overflow-hidden rounded-2xl bg-[#080b11]/95 border border-white/[0.08] shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Breadcrumb Header */}
            {screen !== 'default' && (
              <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-tx-ghost border-b border-white/[0.03]">
                <span>Palette</span>
                <ChevronRight size={10} />
                {screen === 'reassign_lead' && (
                  <>
                    <span className="text-electric">Reassign</span>
                    <ChevronRight size={10} />
                    <span>Select Lead</span>
                  </>
                )}
                {screen === 'reassign_rep' && (
                  <>
                    <span className="text-electric">Reassign</span>
                    <ChevronRight size={10} />
                    <span className="text-tx-bright">{selectedLead?.name}</span>
                    <ChevronRight size={10} />
                    <span>Select Rep</span>
                  </>
                )}
                {screen === 'set_target_rep' && (
                  <>
                    <span className="text-violet">Quota Target</span>
                    <ChevronRight size={10} />
                    <span>Select Rep</span>
                  </>
                )}
                {screen === 'set_target_val' && (
                  <>
                    <span className="text-violet">Quota Target</span>
                    <ChevronRight size={10} />
                    <span className="text-tx-bright">{selectedRep?.name}</span>
                    <ChevronRight size={10} />
                    <span>Quota Value</span>
                  </>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-3 border-b border-line p-4">
              <Search size={18} className="text-tx-ghost" />
              {screen !== 'set_target_val' ? (
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent text-base font-semibold text-tx-bright outline-none placeholder:text-tx-ghost"
                  placeholder={
                    screen === 'reassign_lead' ? 'Search lead to reassign...' :
                    screen === 'reassign_rep' ? `Assign ${selectedLead?.name} to...` :
                    screen === 'set_target_rep' ? 'Select representative...' :
                    'Search leads, reps, commands, or pages...'
                  }
                />
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-base font-semibold text-tx-dim">Enter Monthly Revenue Quota (₹):</span>
                  <input
                    ref={inputRef}
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-lg font-black text-mint outline-none"
                    placeholder="e.g. 200000"
                    autoFocus
                  />
                </div>
              )}
              {screen !== 'default' && (
                <button
                  onClick={() => {
                    setScreen('default');
                    setQuery('');
                    setSelectedIndex(0);
                    window.setTimeout(() => inputRef.current?.focus(), 20);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-md text-[10px] font-bold text-tx-ghost hover:text-white"
                  title="Go Back"
                >
                  <Undo2 size={10} /> Back
                </button>
              )}
              <button onClick={closeCommandPalette} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-tx-ghost">
                <X size={15} />
              </button>
            </div>

            {/* List Results Area */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
              {screen === 'set_target_val' ? (
                <div className="p-4 space-y-4 text-center">
                  <p className="text-sm font-semibold text-tx-dim">
                    Assigning a monthly sales quota target for <span className="text-tx-bright font-extrabold">{selectedRep?.name}</span>.
                    This updates active leaderboards and targets automatically.
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleTargetSubmit}
                      className="px-5 py-2.5 rounded-xl bg-electric hover:bg-electric-light text-white font-extrabold text-xs tracking-wider uppercase transition shadow-glow-electric"
                    >
                      Save Quota Target
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Flat search matches */}
                  {flatItems.length === 0 ? (
                    <div className="px-3 py-10 text-center text-sm font-medium text-tx-ghost">
                      No matching records or actions found.
                    </div>
                  ) : (
                    <>
                      {/* Dynamic Groups (Rendered only on Default Screen) */}
                      {screen === 'default' ? (
                        <div className="space-y-4">
                          {/* Recent Search section */}
                          {query.trim() === '' && recentItems.length > 0 && (
                            <ResultSection title="Recently Used">
                              {recentItems.map((item, idx) => (
                                <PaletteButton
                                  key={item.id}
                                  item={item}
                                  index={idx}
                                  isSelected={selectedIndex === idx}
                                  onClick={() => runAction(item)}
                                  onHover={() => setSelectedIndex(idx)}
                                />
                              ))}
                            </ResultSection>
                          )}

                          {defaultItems.commands.length > 0 && (
                            <ResultSection title="Operational Actions">
                              {defaultItems.commands.map((item) => {
                                const listIdx = flatItems.findIndex(x => x.id === item.id);
                                return (
                                  <PaletteButton
                                    key={item.id}
                                    item={item}
                                    index={listIdx}
                                    isSelected={selectedIndex === listIdx}
                                    onClick={() => runAction(item)}
                                    onHover={() => setSelectedIndex(listIdx)}
                                  />
                                );
                              })}
                            </ResultSection>
                          )}

                          {defaultItems.pages.length > 0 && (
                            <ResultSection title="Views & Navigation">
                              {defaultItems.pages.map((item) => {
                                const listIdx = flatItems.findIndex(x => x.id === item.id);
                                return (
                                  <PaletteButton
                                    key={item.id}
                                    item={item}
                                    index={listIdx}
                                    isSelected={selectedIndex === listIdx}
                                    onClick={() => runAction(item)}
                                    onHover={() => setSelectedIndex(listIdx)}
                                  />
                                );
                              })}
                            </ResultSection>
                          )}

                          {defaultItems.leads.length > 0 && (
                            <ResultSection title="Client Leads">
                              {defaultItems.leads.map((item) => {
                                const listIdx = flatItems.findIndex(x => x.id === item.id);
                                return (
                                  <PaletteButton
                                    key={item.id}
                                    item={item}
                                    index={listIdx}
                                    isSelected={selectedIndex === listIdx}
                                    onClick={() => runAction(item)}
                                    onHover={() => setSelectedIndex(listIdx)}
                                  />
                                );
                              })}
                            </ResultSection>
                          )}

                          {defaultItems.deals.length > 0 && (
                            <ResultSection title="Pipeline Deals">
                              {defaultItems.deals.map((item) => {
                                const listIdx = flatItems.findIndex(x => x.id === item.id);
                                return (
                                  <PaletteButton
                                    key={item.id}
                                    item={item}
                                    index={listIdx}
                                    isSelected={selectedIndex === listIdx}
                                    onClick={() => runAction(item)}
                                    onHover={() => setSelectedIndex(listIdx)}
                                  />
                                );
                              })}
                            </ResultSection>
                          )}

                          {defaultItems.reps.length > 0 && (
                            <ResultSection title="Sales Representatives">
                              {defaultItems.reps.map((item) => {
                                const listIdx = flatItems.findIndex(x => x.id === item.id);
                                return (
                                  <PaletteButton
                                    key={item.id}
                                    item={item}
                                    index={listIdx}
                                    isSelected={selectedIndex === listIdx}
                                    onClick={() => runAction(item)}
                                    onHover={() => setSelectedIndex(listIdx)}
                                  />
                                );
                              })}
                            </ResultSection>
                          )}
                        </div>
                      ) : (
                        // Flat listing for wizard screens
                        <div className="space-y-1 py-2">
                          {flatItems.map((item, idx) => (
                            <PaletteButton
                              key={item.id}
                              item={item}
                              index={idx}
                              isSelected={selectedIndex === idx}
                              onClick={() => runAction(item)}
                              onHover={() => setSelectedIndex(idx)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="flex items-center gap-4 border-t border-white/[0.04] px-5 py-3 text-[10px] font-bold text-tx-ghost">
              <span className="flex items-center gap-1">
                <kbd className="kbd-badge px-1">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd-badge px-1">↵</kbd> Select
              </span>
              {screen !== 'default' && (
                <span className="flex items-center gap-1">
                  <kbd className="kbd-badge px-1">Backspace</kbd> Go Back
                </span>
              )}
              <span className="flex items-center gap-1">
                <kbd className="kbd-badge px-1">esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultSection({ title, children }) {
  return (
    <div className="py-1.5">
      <div className="px-3 pb-1.5 text-[9px] font-black uppercase tracking-wider text-tx-ghost">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function PaletteButton({ item, index, isSelected, onClick, onHover }) {
  const Icon = ICON_MAP[item.iconName] || UserRound;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      data-index={index}
      className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors duration-100
        ${isSelected ? 'bg-white/[0.05]' : 'bg-transparent'}
      `}
    >
      {isSelected && (
        <motion.div
          layoutId="palette-highlight"
          className="absolute inset-0 rounded-lg bg-electric/[0.06] border border-electric/15"
          initial={false}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        />
      )}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-tx-dim group-hover:text-tx-bright transition-colors">
        <Icon size={15} />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-extrabold text-tx-bright">{item.label}</div>
        {item.sub && <div className="truncate text-[10px] font-semibold text-tx-ghost">{item.sub}</div>}
      </div>
      {isSelected && (
        <div className="relative z-10 text-electric flex items-center gap-0.5 font-bold text-[9px] uppercase tracking-wider">
          Execute <CornerDownLeft size={10} />
        </div>
      )}
    </button>
  );
}
