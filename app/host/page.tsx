'use client';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { QRCodeSVG } from 'qrcode.react';

export default function HostPage() {
  const [step, setStep] = useState(1);
  const [material, setMaterial] = useState('');
  const [config, setConfig] = useState({ types: ['MC', 'Short'], mode: 'strict' });
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!material.trim()) return alert('Please enter some material text.');
    
    setLoading(true);
    try {
        const res = await fetch('/api/room', {
            method: 'POST',
            body: JSON.stringify({
                action: 'create',
                materials: [material],
                config: { questionTypes: config.types, gradingMode: config.mode }
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            alert('Error creating room: ' + (data.error || res.statusText));
        } else if (data.roomCode) {
            setRoom(data);
            setStep(2);
        }
    } catch (e) {
        alert('Failed to connect to server.');
    }
    setLoading(false);
  };

  if (step === 1) return (
    <div className="min-h-screen bg-brand-100 p-8 flex justify-center">
      <Card className="max-w-2xl w-full h-fit">
        <h1 className="text-3xl font-black mb-6">🛠️ Create Quiz Room</h1>
        
        <div className="space-y-4">
            <label className="font-bold">1. Upload Material (Paste text or Context)</label>
            <textarea 
                className="w-full h-40 p-3 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                placeholder="Paste article, notes, or lecture content here..."
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
            />
            
            <label className="font-bold block">2. Question Types</label>
            <div className="flex gap-4">
                {['MC', 'Short', 'Long'].map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" 
                            checked={config.types.includes(t)}
                            onChange={(e) => {
                                if(e.target.checked) setConfig({...config, types: [...config.types, t]});
                                else setConfig({...config, types: config.types.filter(x => x !== t)});
                            }}
                        />
                        {t}
                    </label>
                ))}
            </div>

            <label className="font-bold block">3. AI Grading Mode</label>
            <select 
                className="w-full p-2 border-2 border-black rounded-xl"
                value={config.mode}
                onChange={(e) => setConfig({...config, mode: e.target.value})}
            >
                <option value="strict">Strict (Material Only)</option>
                <option value="open">Open (Internet Knowledge)</option>
            </select>

            <Button className="w-full mt-6" onClick={createRoom} disabled={loading}>
                {loading ? 'Generating Quiz via AI...' : 'Generate & Open Room'}
            </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-100 p-8 flex flex-col items-center">
        <Card className="max-w-md w-full text-center">
            <h1 className="text-4xl font-black mb-2">{room.roomCode}</h1>
            <p className="text-gray-500 mb-6">Join Code</p>
            
            <div className="flex justify-center mb-6">
                <QRCodeSVG value={typeof window !== 'undefined' ? `${window.location.origin}/join?code=${room.roomCode}` : ''} size={200} />
            </div>

            <p className="mb-4 font-bold">Waiting for students...</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>Refresh Submissions</Button>
        </Card>
        
        <div className="mt-8 w-full max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Live Results (Reload to update)</h2>
            <div className="bg-white/50 p-4 rounded-xl border-2 border-black border-dashed text-center text-gray-500">
                No submissions yet.
            </div>
        </div>
    </div>
  );
}