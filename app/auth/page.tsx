'use client';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { messages } from '@/contents/messages/en/message';
import { Logo } from '@/components/Logo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = messages.auth;

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) return alert(messages.join.errorEmpty);
    setLoading(true);
    try {
        const res = await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ action: isLogin ? 'login' : 'signup', ...formData })
        });
        const data = await res.json();
        if (res.ok) {
            router.push('/dashboard');
            router.refresh();
        } else {
            alert(data.error || messages.general.error);
        }
    } catch (e) { alert(messages.general.error); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 scale-150"><Logo /></div>
      <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#000]">
        <h2 className="text-3xl font-black mb-6 text-center">{isLogin ? t.welcomeBack : t.joinFun}</h2>
        <div className="space-y-4">
          {!isLogin && (
            <Input placeholder={t.namePlaceholder} value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} />
          )}
          <Input placeholder={t.emailPlaceholder} value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
          <Input type="password" placeholder={t.passwordPlaceholder} value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} />
          
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? t.processing : (isLogin ? t.loginBtn : t.signupBtn)}
          </Button>
          
          <p className="text-center cursor-pointer underline mt-4 font-bold text-gray-500 hover:text-black" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? t.toggleToSignup : t.toggleToLogin}
          </p>
        </div>
      </Card>
    </div>
  );
}