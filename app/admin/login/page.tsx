'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        const res = await fetch('/api/admin', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (res.ok) router.push('/admin');
        else alert('Invalid Admin Credentials');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-white border-4 border-gray-700">
                <h1 className="text-2xl font-black mb-6 text-center">Admin Portal</h1>
                <div className="space-y-4">
                    <Input placeholder="Admin Email" value={email} onChange={(e:any) => setEmail(e.target.value)} />
                    <Input type="password" placeholder="Password" value={password} onChange={(e:any) => setPassword(e.target.value)} />
                    <Button onClick={handleLogin} className="w-full bg-black text-white">Access Dashboard</Button>
                </div>
            </Card>
        </div>
    );
}