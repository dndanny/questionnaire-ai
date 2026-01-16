'use client';
import { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Users, FileText, Activity, LogOut, Zap, Settings } from 'lucide-react';

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [globalLimit, setGlobalLimit] = useState('5');
    const [userLimit, setUserLimit] = useState('');
    const router = useRouter();

    const loadData = () => {
        fetch('/api/admin').then(res => {
            if (!res.ok) router.push('/admin/login');
            else res.json().then(setData);
        });
    };


    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = async () => {
        await fetch('/api/admin', { method: 'DELETE' });
        router.push('/admin/login');
    };

    const fetchUserDetails = async (id: string) => {
        const res = await fetch(`/api/admin?userId=${id}`);
        if (res.ok) {
            const json = await res.json();
            setSelectedUser(json);
            setUserLimit(json.user.aiLimit.toString());
        }
    };

    const handleGlobalUpdate = async () => {
        if(!confirm(`Set AI Limit to ${globalLimit} for ALL users?`)) return;
        await fetch('/api/admin', {
            method: 'POST',
            body: JSON.stringify({ action: 'global_update', limit: Number(globalLimit) })
        });
        alert('Global limit updated.');
        loadData();
    };

    const handleUserLimitUpdate = async () => {
        if(!selectedUser) return;
        await fetch('/api/admin', {
            method: 'POST',
            body: JSON.stringify({ action: 'update_limit', userId: selectedUser.user._id, limit: Number(userLimit) })
        });
        alert('User limit updated.');
        fetchUserDetails(selectedUser.user._id); // Refresh local
        loadData(); // Refresh table
    };

    if (!data) return <div className="min-h-screen bg-gray-100 p-10 font-bold">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6 md:p-10 font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 font-medium">System Overview</p>
                    </div>
                    <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                        <LogOut size={18} /> Sign Out
                    </Button>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <StatCard icon={<Users />} label="Total Users" value={data.stats.totalUsers} />
                    <StatCard icon={<Activity />} label="Attempts" value={data.stats.totalAttempts} />
                    <StatCard icon={<FileText />} label="Quizzes" value={data.stats.totalQuizzes} />
                    
                    {/* GLOBAL CONTROLS */}
                    <Card className="border-l-8 border-l-brand-500 bg-white shadow-sm p-4">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Settings size={12}/> Global AI Limit</div>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                className="w-16 border-2 border-gray-300 rounded p-1 text-center font-bold" 
                                value={globalLimit}
                                onChange={(e) => setGlobalLimit(e.target.value)}
                            />
                            <button onClick={handleGlobalUpdate} className="bg-brand-500 text-white px-3 rounded text-xs font-bold hover:bg-brand-600">Apply All</button>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: USER LIST */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        <Card className="border-2 border-gray-300 shadow-sm">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                <CheckCircle className="text-brand-500" /> Verified Users
                            </h2>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">AI Usage</th>
                                            <th className="p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.users.map((u: any) => (
                                            <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 font-bold">{u.name}</td>
                                                <td className="p-3 text-gray-500">{u.email}</td>
                                                <td className="p-3 font-mono">
                                                    <span className={u.aiUsage >= u.aiLimit ? "text-red-600 font-bold" : "text-green-600"}>
                                                        {u.aiUsage} / {u.aiLimit}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <button onClick={() => fetchUserDetails(u._id)} className="text-blue-600 font-bold underline hover:text-blue-800">
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card className="border-2 border-gray-300 shadow-sm">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                <XCircle className="text-gray-400" /> Guest / Unverified Takers
                            </h2>
                            <div className="overflow-x-auto max-h-60">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="p-3">Student Name</th>
                                            <th className="p-3">Contact Email</th>
                                            <th className="p-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.guests.map((g: any) => (
                                            <tr key={g._id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 font-bold">{g.studentName || 'Guest'}</td>
                                                <td className="p-3 text-gray-500">{g.studentEmail || 'N/A'}</td>
                                                <td className="p-3">{new Date(g.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: USER DETAIL PANEL */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            {selectedUser ? (
                                <Card className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_#000]">
                                    <h3 className="text-xl font-black mb-1">{selectedUser.user.name}</h3>
                                    <p className="text-sm text-gray-500 mb-6">{selectedUser.user.email}</p>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-gray-100 p-4 rounded-xl border-2 border-gray-300">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-bold uppercase flex items-center gap-1"><Zap size={14}/> AI Limit</span>
                                                <span className="text-xs font-bold">{selectedUser.user.aiUsage} used</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2 border-2 border-black rounded"
                                                    value={userLimit}
                                                    onChange={(e) => setUserLimit(e.target.value)}
                                                />
                                                <button onClick={handleUserLimitUpdate} className="bg-black text-white px-3 rounded font-bold">Save</button>
                                            </div>
                                        </div>

                                        <div className="bg-brand-100 p-4 rounded-xl border-2 border-black">
                                            <div className="text-3xl font-black">{selectedUser.stats.hostedRooms}</div>
                                            <div className="text-xs font-bold uppercase">Quizzes Hosted</div>
                                        </div>
                                        <div className="bg-accent-yellow p-4 rounded-xl border-2 border-black">
                                            <div className="text-3xl font-black">{selectedUser.stats.takenQuizzes}</div>
                                            <div className="text-xs font-bold uppercase">Quizzes Taken</div>
                                        </div>
                                    </div>
                                    
                                    <Button variant="secondary" className="w-full mt-6" onClick={() => setSelectedUser(null)}>
                                        Close Details
                                    </Button>
                                </Card>
                            ) : (
                                <div className="border-4 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 font-bold">
                                    Select a user to manage limits.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ icon, label, value }: any) => (
    <Card className="flex items-center gap-4 border-l-8 border-l-black">
        <div className="bg-gray-100 p-3 rounded-full">{icon}</div>
        <div>
            <div className="text-3xl font-black">{value}</div>
            <div className="text-xs font-bold text-gray-400 uppercase">{label}</div>
        </div>
    </Card>
);