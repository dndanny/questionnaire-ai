'use client';
import { useState, useRef } from 'react';
import { Button, Card } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { messages } from '@/contents/messages/en/message';
import { Logo } from '@/components/Logo';
import { Upload, Link as LinkIcon, Image as ImageIcon, FileText, X, File, FileType, PenTool } from 'lucide-react';

export default function CreateRoomPage() {
  const router = useRouter();
  const t = messages.host.create;
  
  const [blueprintItems, setBlueprintItems] = useState<any[]>([]);

  const [blueprintTextInput, setBlueprintTextInput] = useState('');
  const [blueprintLinkInput, setBlueprintLinkInput] = useState('');
  const [showBpLinkInput, setShowBpLinkInput] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [items, setItems] = useState<Array<{type: 'text'|'image'|'url'|'pdf', content: string, name?: string}>>([]);
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [counts, setCounts] = useState({ mc: 5, short: 2, long: 0 });
  const [config, setConfig] = useState({ mode: 'strict', markingType: 'batch' });
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  
  // Calculate total characters to warn user
  const totalChars = items.reduce((acc, item) => acc + (item.type === 'image' ? 1000 : item.content.length), 0) + textInput.length;
  const isOverload = totalChars > 50000;

  const fileInputRef = useRef<HTMLInputElement>(null);

  
  // Reuse existing processFiles but target different state? 
  // Better to make a generic handler. 
  // For simplicity in this script, we'll create a dedicated handler for Blueprint input.
  
  const handleBlueprintSelect = (e: any) => {
    if (e.target.files) processBlueprintFiles(Array.from(e.target.files));
  };

  const processBlueprintFiles = (files: any[]) => {
    files.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            let type = 'text';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type === 'application/pdf') type = 'pdf';
            
            setBlueprintItems(prev => [...prev, { type: type as any, content, name: file.name }]);
        };
        if (file.type.startsWith('image/') || file.type === 'application/pdf') reader.readAsDataURL(file);
        else reader.readAsText(file);
    });
  };

  
  const addBlueprintText = () => {
    if(!blueprintTextInput.trim()) return;
    setBlueprintItems(prev => [...prev, { type: 'text', content: blueprintTextInput, name: 'Style Note' }]);
    setBlueprintTextInput('');
  };

  const addBlueprintLink = () => {
    if(!blueprintLinkInput.trim()) return;
    setBlueprintItems(prev => [...prev, { type: 'url', content: blueprintLinkInput, name: blueprintLinkInput }]);
    setBlueprintLinkInput('');
    setShowBpLinkInput(false);
  };

  const removeBlueprintItem = (idx: number) => {
      setBlueprintItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileSelect = (e: any) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const processFiles = (files: any[]) => {
    files.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (file.type.startsWith('image/')) {
                setItems(prev => [...prev, { type: 'image', content, name: file.name }]);
            } else if (file.type === 'application/pdf') {
                setItems(prev => [...prev, { type: 'pdf', content, name: file.name }]);
            } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
                 setItems(prev => [...prev, { type: 'text', content, name: file.name }]);
            }
        };
        if (file.type === 'text/plain' || file.name.endsWith('.md')) reader.readAsText(file);
        else reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: any) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFiles(Array.from(e.clipboardData.files));
        return;
    }
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            processFiles([blob]);
        }
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
        e.dataTransfer.clearData();
    }
  };

  const addLink = () => {
    if(!linkInput.trim()) return;
    setItems(prev => [...prev, { type: 'url', content: linkInput, name: linkInput }]);
    setLinkInput('');
    setShowLinkInput(false);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const createRoom = async () => {
    if (!manualMode && items.length === 0 && !textInput.trim()) return alert("Please add some material!");
    
    
    const finalItems = [...items];
    if (textInput.trim()) finalItems.push({ type: 'text', content: textInput, name: 'Text Note' });

    // Combine Blueprint Items + Pending Text
    const finalBlueprint = [...blueprintItems];
    if (blueprintTextInput.trim()) finalBlueprint.push({ type: 'text', content: blueprintTextInput, name: 'Style Note' });

    setLoading(true);
    try {
        const res = await fetch('/api/room', {
            method: 'POST',
            body: JSON.stringify({
                action: 'create',
                manual: manualMode,
                materials: finalItems,
                blueprint: finalBlueprint, // Send the complete list
                counts,
                config: { gradingMode: config.mode, markingType: config.markingType }
            })
        });
        const data = await res.json();
        
        if (res.ok && data.roomId) {
            // Redirect to EDIT if manual, or DASHBOARD if AI
            router.push(manualMode ? `/host/${data.roomId}/edit` : `/host/${data.roomId}`);
        } else {
            alert(data.error || "Error creating room");
        }
    } catch (e) { alert("Server Error"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-100 p-4 md:p-8 flex justify-center items-center overflow-y-auto">
      <div className="w-full max-w-3xl">
         <div className="mb-6 flex justify-center"><Logo /></div>
         
         <Card className="w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]">
            <h1 className="text-3xl font-black mb-6 border-b-2 border-gray-100 pb-4">{t.title}</h1>
            
            <div className="space-y-8">
                
                {/* MANUAL MODE TOGGLE */}
                <div className="flex items-center justify-between bg-gray-100 p-4 rounded-xl border-2 border-gray-300">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><PenTool size={18}/> Manual Mode (No AI)</h3>
                        <p className="text-xs text-gray-500">Create quiz yourself. Does not use AI quota.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={manualMode} onChange={e => setManualMode(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                </div>

                {/* UPLOAD SECTION (Hidden if Manual) */}
                {!manualMode && (
                    <div>
                        <label className="font-bold block mb-2">{t.step1}</label>
                        
                        <div 
                            onPaste={handlePaste}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            className="border-4 border-dashed border-gray-300 rounded-xl bg-gray-50 p-4 transition-colors focus-within:border-brand-500 focus-within:bg-white hover:border-brand-300 relative"
                        >
                            <textarea 
                                className="w-full h-32 bg-transparent outline-none resize-none text-lg"
                                placeholder="Paste text, drop PDFs/Images, or paste files here..."
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                            />
                            
                            <div className="flex gap-2 mt-2 border-t-2 border-gray-200 pt-2 items-center flex-wrap">
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf,.txt,.md,.csv" onChange={handleFileSelect} />
                                
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-300 transition-all">
                                    <File size={18} /> Browse Local
                                </button>
                                
                                <div className="relative">
                                    <button onClick={() => setShowLinkInput(!showLinkInput)} className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-black hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-300 transition-all">
                                        <LinkIcon size={18} /> Input Link
                                    </button>
                                    {showLinkInput && (
                                        <div className="absolute top-10 left-0 bg-white border-2 border-black p-2 rounded-lg shadow-lg z-20 flex gap-2 w-64 animate-in fade-in slide-in-from-top-2">
                                            <input className="flex-1 text-sm outline-none" placeholder="https://..." value={linkInput} onChange={e => setLinkInput(e.target.value)} autoFocus />
                                            <button onClick={addLink} className="bg-black text-white px-2 rounded text-xs">Add</button>
                                        </div>
                                    )}
                                </div>
                                
                                <span className="text-xs text-gray-400 ml-auto hidden sm:block">PDF, Text, Images, Links</span>
                            </div>
                        </div>

                        {/* ITEMS LIST */}
                        {items.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="relative bg-white border-2 border-black rounded-lg p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center group">
                                        <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 border-2 border-black hover:scale-110 z-10">
                                            <X size={12} />
                                        </button>
                                        
                                        <div className="h-16 w-full flex items-center justify-center bg-gray-50 rounded mb-2 overflow-hidden border border-gray-100">
                                            {item.type === 'image' && <img src={item.content} className="h-full w-full object-cover" />}
                                            {item.type === 'text' && <FileText size={32} className="text-gray-400" />}
                                            {item.type === 'url' && <LinkIcon size={32} className="text-blue-400" />}
                                            {item.type === 'pdf' && <FileType size={32} className="text-red-500" />}
                                        </div>
                                        
                                        <span className="text-[10px] font-bold truncate w-full text-center block px-1">
                                            {item.name || (item.content.substring(0, 15) + '...')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                
                
                {/* ADVANCED: BLUEPRINT */}
                {!manualMode && (
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full p-4 bg-gray-50 flex justify-between items-center font-bold text-gray-600 hover:bg-gray-100"
                        >
                            <span className="flex items-center gap-2">⚡ Advanced: Blueprint / Style Guide</span>
                            <span>{showAdvanced ? '▲' : '▼'}</span>
                        </button>
                        
                        {showAdvanced && (
                            <div className="p-4 bg-white border-t-2 border-gray-100">
                                <p className="text-xs text-gray-500 mb-3 font-medium">
                                    Tell the AI how to format the quiz. Upload past exams, paste style instructions (e.g. &quot;Make it hard&quot;), or link to a syllabus.
                                </p>
                                
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 focus-within:bg-white focus-within:border-brand-300 transition-colors">
                                    <textarea 
                                        className="w-full h-20 bg-transparent outline-none resize-none text-sm font-medium"
                                        placeholder="Type instructions here (e.g., 'Focus on Chapter 4, multiple choice should be tricky')..."
                                        value={blueprintTextInput}
                                        onChange={(e) => setBlueprintTextInput(e.target.value)}
                                    />
                                    
                                    <div className="flex gap-2 mt-2 border-t-2 border-gray-200 pt-2 items-center flex-wrap">
                                        <input type="file" id="bp-upload" className="hidden" multiple accept="image/*,.pdf,.txt" onChange={handleBlueprintSelect} />
                                        
                                        <button onClick={() => document.getElementById('bp-upload')?.click()} className="flex items-center gap-1 bg-white border border-gray-300 px-3 py-1 rounded text-xs font-bold shadow-sm hover:bg-gray-100">
                                            <File size={14} /> Upload File
                                        </button>

                                        <div className="relative">
                                            <button onClick={() => setShowBpLinkInput(!showBpLinkInput)} className="flex items-center gap-1 bg-white border border-gray-300 px-3 py-1 rounded text-xs font-bold shadow-sm hover:bg-gray-100">
                                                <LinkIcon size={14} /> Add Link
                                            </button>
                                            {showBpLinkInput && (
                                                <div className="absolute top-8 left-0 bg-white border-2 border-black p-2 rounded-lg shadow-lg z-20 flex gap-2 w-64">
                                                    <input className="flex-1 text-xs outline-none" placeholder="https://..." value={blueprintLinkInput} onChange={e => setBlueprintLinkInput(e.target.value)} autoFocus />
                                                    <button onClick={addBlueprintLink} className="bg-black text-white px-2 rounded text-xs">Add</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* LIST */}
                                {blueprintItems.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mt-3 w-full">
                                        {blueprintItems.map((item, idx) => (
                                            <div key={idx} className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm">
                                                {item.type === 'text' && <FileText size={10} />}
                                                {item.type === 'url' && <LinkIcon size={10} />}
                                                {item.type === 'image' && <ImageIcon size={10} />}
                                                {item.type === 'pdf' && <FileType size={10} />}
                                                <span className="truncate max-w-[150px] font-bold">{item.name}</span>
                                                <button onClick={() => removeBlueprintItem(idx)} className="ml-1 hover:text-red-500"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}


{/* CONFIG SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {!manualMode && (
                        <div>
                            <label className="font-bold block mb-2">{t.step2}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['mc', 'short', 'long'].map(k => (
                                    <div key={k} className="text-center">
                                        <label className="uppercase font-black text-[10px] text-gray-500 mb-1 block">{k}</label>
                                        <input type="number" min="0" className="w-full p-2 border-2 border-black rounded-lg text-center font-bold text-xl"
                                            value={counts[k as keyof typeof counts]} onChange={e => setCounts({...counts, [k]: +e.target.value})} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="font-bold block mb-2">{t.step3}</label>
                        <div className="space-y-3">
                             <select className="w-full p-2 border-2 border-black rounded-lg font-medium"
                                value={config.mode} onChange={(e) => setConfig({...config, mode: e.target.value})}>
                                <option value="strict">Strict (Context Only)</option>
                                <option value="open">Open (Internet Knowledge)</option>
                            </select>
                             <select className="w-full p-2 border-2 border-black rounded-lg font-medium"
                                value={config.markingType} onChange={(e) => setConfig({...config, markingType: e.target.value})}>
                                <option value="batch">Batch Marking (Save AI)</option>
                                <option value="instant">Instant Marking</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button className="flex-1 py-4 text-lg bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_#00BCD4]" onClick={createRoom} disabled={loading}>
                        {loading ? 'Generating...' : (manualMode ? 'Create Empty Room' : t.btnGenerate)}
                    </Button>
                    <Button variant="secondary" onClick={() => router.back()}>{messages.general.cancel}</Button>
                </div>
            </div>
         </Card>
      </div>
    </div>
  );
}