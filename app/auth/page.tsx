'use client';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function AuthPage() {
  const [step, setStep] = useState<'auth' | 'verify'>('auth');
  const [isLogin, setIsLogin] = useState(true);
  
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ action: isLogin ? 'login' : 'signup', ...formData })
        });
        const data = await res.json();
        
        if (res.ok) {
            if (data.verify) {
                setStep('verify');
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } else {
            // Handle unverified login attempt
            if (res.status === 403 && data.verify) {
                setStep('verify');
            } else {
                alert(data.error);
            }
        }
    } catch (e) { alert("Error connecting to server"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/auth/action', {
            method: 'POST',
            body: JSON.stringify({ action: 'verify', email: formData.email, code: otp })
        });
        const data = await res.json();
        if (res.ok) {
            router.push('/dashboard');
            router.refresh();
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error connecting to server"); }
    setLoading(false);
  };

  const handleResend = async () => {
      setLoading(true);
      await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'resend', email: formData.email })
      });
      alert("New code sent!");
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 scale-150"><Logo /></div>
      <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#000]">
        
        {step === 'auth' ? (
            <>
                <h2 className="text-3xl font-black mb-6 text-center">{isLogin ? "Welcome Back!" : "Create Account"}</h2>
                <div className="space-y-4">
                    {!isLogin && (
                        <Input placeholder="Full Name" value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} />
                    )}
                    <Input placeholder="Email Address" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
                    <Input type="password" placeholder="Password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} />
                    
                    <Button className="w-full" onClick={handleAuth} disabled={loading}>
                        {loading ? "Processing..." : (isLogin ? "Login" : "Sign Up & Verify")}
                    </Button>
                    
                    <p className="text-center cursor-pointer underline mt-4 font-bold text-gray-500" onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
                    </p>
                </div>
            </>
        ) : (
            <>
                <h2 className="text-3xl font-black mb-2 text-center">Verify Email</h2>
                <p className="text-center text-gray-600 mb-6">Enter the 6-digit code sent to <strong>{formData.email}</strong></p>
                
                <div className="space-y-4">
                    <input 
                        className="w-full p-4 text-center text-3xl font-black tracking-[10px] border-4 border-black rounded-xl"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    
                    <Button className="w-full" onClick={handleVerify} disabled={loading}>
                        {loading ? "Verifying..." : "Confirm Code"}
                    </Button>
                    
                    <button onClick={handleResend} disabled={loading} className="w-full text-center text-sm font-bold underline mt-2">
                        Resend Code
                    </button>
                    <button onClick={() => setStep('auth')} className="w-full text-center text-xs text-gray-400 mt-4">
                        Change Email
                    </button>
                </div>
            </>
        )}

      </Card>
    </div>
  );
}