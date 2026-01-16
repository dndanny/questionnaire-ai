'use client';
import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function Settings() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth/me').then(res => res.json()).then(setUser);
    }, []);

    if (!user) return <div className="p-10">Loading...</div>;

    const percent = Math.min(100, (user.aiUsage / user.aiLimit) * 100);

    return (
        <div className="min-h-screen bg-brand-100 p-8 flex justify-center">
            <Card className="w-full max-w-lg">
                <h1 className="text-3xl font-black mb-6">⚙️ User Settings</h1>
                
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-black mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold flex items-center gap-2"><Zap className="text-yellow-500" /> Automation Usage</span>
                        <span className="text-sm font-black">{user.aiUsage} / {user.aiLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 border border-black overflow-hidden">
                        <div className="bg-brand-500 h-full transition-all" style={{ width: `${percent}%` }}></div>
                    </div>
                    {percent >= 100 && <p className="text-red-500 text-xs font-bold mt-2">Quota Exceeded. Contact Admin.</p>}
                </div>

                <div className="space-y-2">
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                </div>

                <Button className="w-full mt-6" variant="secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </Card>
        </div>
    );
}