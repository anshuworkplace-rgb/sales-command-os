import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle2, AlertTriangle, FileText, ChevronRight, Play, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import useLeadStore from '../../stores/useLeadStore';
import useUIStore from '../../stores/useUIStore';
import useUserStore from '../../stores/useUserStore';
import { parseHinglishFeedback } from '../../engines/hinglishParser';
import useToastStore from '../../stores/useToastStore';

// Zod Schema for lead validation
const csvLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Phone must be at least 7 digits').regex(/^[+\d\s-]{7,20}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  capital: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
});

const DB_FIELDS = [
  { key: 'name', label: 'Name *', required: true },
  { key: 'phone', label: 'Phone *', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'capital', label: 'Capital', required: false },
  { key: 'notes', label: 'Notes / Feedback', required: false },
  { key: 'source', label: 'Source', required: false },
];

export default function ImportModal() {
  const { isImportOpen, closeImport } = useUIStore();
  const { addLead, leads, updateLead } = useLeadStore();
  const { users, getCurrentUser } = useUserStore();
  const { addToast } = useToastStore();
  const cur = getCurrentUser();
  const isM = ['manager', 'admin'].includes(cur?.role);

  // Stepper state: 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'
  const [step, setStep] = useState('upload');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [leadType, setLeadType] = useState('web_lead');
  const [assigneeId, setAssigneeId] = useState('');

  // Dry run result states
  const [dryRunData, setDryRunData] = useState({
    valid: [],      // { rowNum, data }
    duplicates: [], // { rowNum, data, existingLead }
    invalid: [],    // { rowNum, rawData, errors }
  });

  // Settings
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'overwrite' | 'clone'
  const [skipErrors, setSkipErrors] = useState(true);

  // Execution states
  const [importProgress, setImportProgress] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  const fileInputRef = useRef(null);

  // Parse CSV helper
  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/);
    const rows = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      // Quote-aware splitter
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/^"|"$/g, '').trim());
      rows.push(cols);
    }
    return rows;
  };

  // Step 1: File upload handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileContent(text);
      const rows = parseCSVText(text);
      if (rows.length < 2) {
        addToast('CSV must contain a header row and at least 1 data row', 'error');
        return;
      }
      
      const headers = rows[0];
      setCsvHeaders(headers);
      setCsvRows(rows.slice(1));

      // Attempt smart auto-mapping matching header string to DB fields
      const mapping = {};
      DB_FIELDS.forEach(f => {
        const match = headers.findIndex(h => {
          const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const lowerF = f.key.toLowerCase();
          return lowerH === lowerF || lowerH.includes(lowerF) || lowerF.includes(lowerH);
        });
        if (match > -1) {
          mapping[f.key] = headers[match];
        }
      });
      setFieldMapping(mapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      addToast('Please upload a valid CSV file', 'error');
    }
  };

  // Step 2: Dry Run Validation
  const runDryRun = () => {
    const nameHeader = fieldMapping['name'];
    const phoneHeader = fieldMapping['phone'];

    if (!nameHeader || !phoneHeader) {
      addToast('Name and Phone column mappings are required', 'error');
      return;
    }

    const valid = [];
    const duplicates = [];
    const invalid = [];

    csvRows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const mappedLead = {};

      DB_FIELDS.forEach(field => {
        const csvHeader = fieldMapping[field.key];
        if (csvHeader) {
          const headerIdx = csvHeaders.indexOf(csvHeader);
          if (headerIdx > -1) {
            mappedLead[field.key] = row[headerIdx] || '';
          }
        } else {
          mappedLead[field.key] = '';
        }
      });

      // Parse HInglish details if feedback exists
      const rawFeedback = mappedLead.notes || '';
      let parsedHinglish = {};
      if (rawFeedback) {
        parsedHinglish = parseHinglishFeedback(rawFeedback);
      }

      // Safe validate with Zod
      const valResult = csvLeadSchema.safeParse(mappedLead);

      if (!valResult.success) {
        // Validation errors
        const formattedErrors = valResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        invalid.push({ rowNum, rawData: mappedLead, errors: formattedErrors });
      } else {
        // Clean and validate duplicates
        const formattedPhone = mappedLead.phone.replace(/[^\d]/g, '').slice(-10);
        
        // Match existing leads in store by last 10 digits
        const match = leads.find(l => {
          const cleanLPhone = l.phone?.replace(/[^\d]/g, '').slice(-10);
          return cleanLPhone && cleanLPhone === formattedPhone;
        });

        const finalLeadData = {
          ...mappedLead,
          phone: formattedPhone,
          capital_numeric: parsedHinglish.capital?.numeric || 0,
          notes: rawFeedback || null,
          broker: parsedHinglish.brokers?.[0] || null,
          trading_experience: parsedHinglish.experience?.[0]?.key || null,
          assigned_to: assigneeId || cur?.id,
          status: 'fresh_enquiry',
          lead_type: leadType,
          next_follow_up: parsedHinglish.followUpTime?.iso || null,
          follow_up_note: parsedHinglish.followUpTime ? parsedHinglish.followUpTime.display : null,
        };

        if (match) {
          duplicates.push({ rowNum, data: finalLeadData, existingLead: match });
        } else {
          valid.push({ rowNum, data: finalLeadData });
        }
      }
    });

    setDryRunData({ valid, duplicates, invalid });
    setStep('preview');
  };

  // Step 3: Run Actual Import
  const startImportCommit = async () => {
    let importList = [...dryRunData.valid];

    if (duplicateStrategy === 'clone') {
      importList = [...importList, ...dryRunData.duplicates];
    } else if (duplicateStrategy === 'overwrite') {
      // Duplicates will be handled separately as updates
    }
    // If 'skip', duplicates are left out of import list

    const totalActions = importList.length + (duplicateStrategy === 'overwrite' ? dryRunData.duplicates.length : 0);
    if (totalActions === 0) {
      addToast('No leads to import', 'warning');
      return;
    }

    setStep('importing');
    setTotalToImport(totalActions);
    setImportProgress(0);
    setImportStats({ success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    // 1. Process inserts
    for (let i = 0; i < importList.length; i++) {
      try {
        await addLead(importList[i].data);
        successCount++;
      } catch (err) {
        console.error(err);
        failedCount++;
      }
      setImportProgress(Math.round(((successCount + failedCount) / totalActions) * 100));
      setImportStats({ success: successCount, failed: failedCount });
    }

    // 2. Process overwrite updates
    if (duplicateStrategy === 'overwrite') {
      const overwrites = dryRunData.duplicates;
      for (let i = 0; i < overwrites.length; i++) {
        try {
          const item = overwrites[i];
          await updateLead(item.existingLead.id, {
            ...item.data,
            // Retain original lead assignments / status if desired, or overwrite
            status: item.existingLead.status,
            assigned_to: item.existingLead.assigned_to,
          });
          successCount++;
        } catch (err) {
          console.error(err);
          failedCount++;
        }
        setImportProgress(Math.round(((successCount + failedCount) / totalActions) * 100));
        setImportStats({ success: successCount, failed: failedCount });
      }
    }

    addToast(`Import Complete! Imported: ${successCount}, Failed: ${failedCount}`, 'success');
    setStep('complete');
  };

  const resetWizard = () => {
    setFileName('');
    setFileContent('');
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setDryRunData({ valid: [], duplicates: [], invalid: [] });
    setStep('upload');
  };

  if (!isImportOpen) return null;

  const salesReps = users.filter(m => m.role === 'sales' || m.role === 'manager');
  const activeTabClass = "border-b-2 border-electric text-electric font-black";
  const inactiveTabClass = "text-tx-ghost hover:text-tx-dim";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#0a0f1c]/80 backdrop-blur-sm" onClick={closeImport} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-gradient-to-br from-[#0d1525] to-[#0a0f1c] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center shadow-glow-electric">
                <Upload size={15} className="text-electric animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-tx-bright">Smart CSV Import Command</h3>
                <p className="text-[10px] text-tx-ghost">Validated batch parsing with deduplication & dry-runs</p>
              </div>
            </div>
            <button onClick={() => { closeImport(); resetWizard(); }} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-tx-ghost focus-visible:ring-2 focus-visible:ring-electric outline-none">
              <X size={16} />
            </button>
          </div>

          {/* Stepper Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* Step 1: Upload CSV */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1.5">Import Lead Type</label>
                    <select
                      value={leadType}
                      onChange={(e) => setLeadType(e.target.value)}
                      className="w-full bg-[#070b15] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-tx-bright outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-electric"
                    >
                      <option value="web_lead">🌐 Web Leads (Marketing)</option>
                      <option value="mass_data">📋 Mass Data (Cold Call)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1.5">Assign Uploaded Batch To</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full bg-[#070b15] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-tx-bright outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-electric"
                    >
                      <option value="">Default (Self Assignment)</option>
                      {salesReps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-white/[0.08] hover:border-electric/40 bg-white/[0.01] hover:bg-white/[0.02] p-10 rounded-2xl text-center cursor-pointer transition duration-300 flex flex-col items-center justify-center gap-3 relative group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".csv" 
                    className="hidden" 
                  />
                  <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center group-hover:scale-110 transition duration-300">
                    <FileText size={20} className="text-tx-ghost group-hover:text-electric transition" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-tx-bright">Drag & drop your CSV file here, or <span className="text-electric underline">browse</span></p>
                    <p className="text-[10px] text-tx-ghost mt-1">Supports standard comma-separated text files (.csv)</p>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                  <span className="font-bold text-tx-ghost text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    💡 Tips for Clean Imports:
                  </span>
                  <p className="text-[10px] text-tx-dim leading-relaxed">
                    - Ensure your file has a header row mapping to Name and Phone.<br/>
                    - Clean phone numbers to standard 10-digit Indian formats if possible (the importer will automatically sanitize extra symbols).<br/>
                    - Notes/Feedback columns are processed through the Hinglish Intelligence parser to auto-extract Brokers, trading experience, follow-up dates, and capital values.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Mapping columns */}
            {step === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-2">
                  <span className="text-[11px] font-bold text-tx-dim">CSV Headers detected in <span className="text-electric font-black">{fileName}</span></span>
                  <button onClick={resetWizard} className="text-[9px] uppercase tracking-wider text-coral hover:underline font-bold">Upload Different File</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {DB_FIELDS.map(field => {
                    const mappedVal = fieldMapping[field.key] || '';
                    return (
                      <div key={field.key} className="flex flex-col gap-1.5 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl hover:bg-white/[0.02] transition">
                        <label className="text-[10.5px] font-bold text-tx-bright flex items-center justify-between">
                          <span>{field.label}</span>
                          {field.required && <span className="text-[8px] text-coral bg-coral/10 px-1.5 py-0.2 rounded font-black tracking-widest uppercase">Required</span>}
                        </label>
                        <select
                          value={mappedVal}
                          onChange={(e) => setFieldMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full bg-[#070b15] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-tx-bright outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-electric"
                        >
                          <option value="">-- Do Not Map --</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={runDryRun}
                  className="w-full py-2.5 bg-gradient-to-r from-electric to-blue-600 hover:shadow-neon-violet text-void text-xs font-black uppercase tracking-wider rounded-xl hover:scale-[1.01] active:scale-[0.99] transition duration-300"
                >
                  Run Validation & Deduplication Dry-Run →
                </button>
              </div>
            )}

            {/* Step 3: Dry run preview */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-mint/5 border border-mint/15 rounded-xl text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-mint block">Valid Leads</span>
                    <span className="text-xl font-black text-mint">{dryRunData.valid.length}</span>
                  </div>
                  <div className="p-3 bg-gold/5 border border-gold/15 rounded-xl text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-gold block">Duplicates</span>
                    <span className="text-xl font-black text-gold">{dryRunData.duplicates.length}</span>
                  </div>
                  <div className="p-3 bg-coral/5 border border-coral/15 rounded-xl text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-coral block">Errors</span>
                    <span className="text-xl font-black text-coral">{dryRunData.invalid.length}</span>
                  </div>
                </div>

                {/* Import Strategy Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">Duplicate Strategy</label>
                    <select
                      value={duplicateStrategy}
                      onChange={e => setDuplicateStrategy(e.target.value)}
                      className="w-full bg-[#070b15] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-tx-bright outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-electric"
                    >
                      <option value="skip">Skip duplicates (Recommended)</option>
                      <option value="overwrite">Overwrite existing leads with CSV values</option>
                      <option value="clone">Import as duplicate entries anyway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-tx-ghost uppercase tracking-wider mb-1">Validation Error Handling</label>
                    <select
                      value={String(skipErrors)}
                      onChange={e => setSkipErrors(e.target.value === 'true')}
                      className="w-full bg-[#070b15] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-tx-bright outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-electric"
                    >
                      <option value="true">Skip invalid rows & import correct leads</option>
                      <option value="false">Abort entire upload on errors</option>
                    </select>
                  </div>
                </div>

                {/* Dry Run Error list */}
                {dryRunData.invalid.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-coral font-bold">
                      <AlertCircle size={14} /> Validation Errors detected ({dryRunData.invalid.length}):
                    </div>
                    <div className="bg-[#0b0f19] border border-coral/10 rounded-xl p-2.5 max-h-[140px] overflow-y-auto text-[9.5px] font-mono text-coral/80 space-y-1">
                      {dryRunData.invalid.map((inv, i) => (
                        <div key={i} className="py-0.5 border-b border-white/[0.02] last:border-0">
                          Row {inv.rowNum}: <span className="font-sans text-tx-bright font-bold">{inv.rawData.name || 'Unknown'}</span> - {inv.errors}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep('mapping')}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.06] text-tx-bright text-xs font-bold rounded-xl active:scale-95 transition"
                  >
                    ← Back to Mapping
                  </button>
                  <button
                    onClick={startImportCommit}
                    disabled={!skipErrors && dryRunData.invalid.length > 0}
                    className="flex-1 py-2.5 bg-gradient-to-r from-mint to-[#059669] hover:shadow-glow-mint text-void text-xs font-black uppercase tracking-wider rounded-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-35 disabled:pointer-events-none transition duration-300"
                  >
                    Confirm & Start Batch Import
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Execution Progress */}
            {step === 'importing' && (
              <div className="py-10 text-center space-y-6">
                <RefreshCw className="mx-auto text-electric animate-spin" size={36} />
                <div className="space-y-2 max-w-xs mx-auto">
                  <p className="text-xs text-tx-bright font-black">Executing optimistic batch inserts...</p>
                  <div className="h-2 rounded-full bg-white/[0.03] border border-white/[0.04] overflow-hidden p-[1px] w-full">
                    <div className="h-full rounded-full bg-electric transition-all duration-300" style={{ width: `${importProgress}%`, boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)' }} />
                  </div>
                  <p className="text-[10px] text-tx-ghost font-mono">Progress: {importProgress}% ({importStats.success + importStats.failed} / {totalToImport})</p>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && (
              <div className="py-8 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center mx-auto text-mint shadow-glow-mint">
                  <Check size={28} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-tx-bright">Import Batch Processed Successfully</h4>
                  <p className="text-[10px] text-tx-ghost mt-1">Updates have roll-up triggered in lead analytics</p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-4 bg-white/[0.01] border border-white/[0.05] rounded-xl text-left font-mono text-xs">
                  <div>
                    <span className="text-tx-ghost text-[10px]">Successfully Imported:</span>
                    <p className="text-lg font-black text-mint mt-0.5">{importStats.success} Leads</p>
                  </div>
                  <div>
                    <span className="text-tx-ghost text-[10px]">Failed Rows:</span>
                    <p className="text-lg font-black text-coral mt-0.5">{importStats.failed} Rows</p>
                  </div>
                </div>

                <button
                  onClick={() => { closeImport(); resetWizard(); }}
                  className="w-full max-w-sm mx-auto py-2.5 bg-electric text-void text-xs font-black uppercase tracking-wider rounded-xl hover:scale-[1.01] active:scale-[0.99] transition duration-300"
                >
                  Done (Close Window)
                </button>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
