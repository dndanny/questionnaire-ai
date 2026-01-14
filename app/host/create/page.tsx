'use client';
import { useState, useRef } from 'react';
import { Button, Card } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { messages } from '@/contents/messages/en/message';
import { Logo } from '@/components/Logo';
import { Upload, Link as LinkIcon, Image as ImageIcon, FileText, X, File, FileType } from 'lucide-react';

export default function CreateRoomPage() {
  const router = useRouter();
  const t = messages.host.create;
  
  // 'pdf' type added
  const [items, setItems] = useState<Array<{type: 'text'|'image'|'url'|'pdf', content: string, name?: string}>>([]);
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [counts, setCounts] = useState({ mc: 5, short: 2, long: 0 });
  const [config, setConfig] = useState({ mode: 'strict', markingType: 'batch' });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: any) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const processFiles = (files: any[]) => {
    files.forEach((file: any) => {
        const reader = new FileReader();
        
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            
            // Image
            if (file.type.startsWith('image/')) {
                setItems(prev => [...prev, { type: 'image', content, name: file.name }]);
            } 
            // PDF
            else if (file.type === 'application/pdf') {
                setItems(prev => [...prev, { type: 'pdf', content, name: file.name }]);
            }
            // Text / Code
            else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
                // If read as data URL (default behavior of this flow), we might need to decode or just readAsText.
                // However, for consistency, let's read text files via readAsText in a separate pass or decode the base64.
                // To keep it simple, we restart reader for text if needed, OR just store content if it was read as text.
                // Wait, reader.readAsDataURL is called below for all. 
                // For text files, let's create a specific reader.
            }
        };

        // Logic split based on type
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
            const textReader = new FileReader();
            textReader.onload = (ev) => {
                 setItems(prev => [...prev, { type: 'text', content: ev.target?.result as string, name: file.name }]);
            };
            textReader.readAsText(file);
        } else {
            // Images and PDFs go as DataURL (Base64)
            reader.readAsDataURL(file);
        }
    });
  };

  const handlePaste = (e: any) => {
    // 1. Files from Desktop (Copy/Paste file)
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFiles(Array.from(e.clipboardData.files));
        return;
    }

    // 2. Images from Screenshot
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
    if (items.length === 0 && !textInput) return alert("Please add some material!");
    const finalItems = [...items];
    if (textInput.trim()) finalItems.push({ type: 'text', content: textInput, name: 'Text Note' });

    setLoading(true);
    try {
        const res = await fetch('/api/room', {
            method: 'POST',
            body: JSON.stringify({
                action: 'create',
                materials: finalItems,
                counts,
                config: { gradingMode: config.mode, markingType: config.markingType }
            })
        });
        const data = await res.json();
        if (data.roomId) router.push(`/host/${data.roomId}`);
        else alert(data.error);
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
                {/* --- UPLOAD SECTION --- */}
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
                                    
                                    <span className="text-[9px] uppercase font-black text-gray-400 mt-1">{item.type}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                <option value="batch">Batch Marking</option>
                                <option value="instant">Instant Marking</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button className="flex-1 py-4 text-lg bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_#00BCD4]" onClick={createRoom} disabled={loading}>
                        {loading ? 'Reading Files & Generating...' : t.btnGenerate}
                    </Button>
                    <Button variant="secondary" onClick={() => router.back()}>{messages.general.cancel}</Button>
                </div>
            </div>
         </Card>
      </div>
    </div>
  );
}