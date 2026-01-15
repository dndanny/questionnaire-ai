'use client';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

type AuthStep = 'login' | 'signup' | 'verify' | 'forgot' | 'reset';

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('login');
  
  // Unified Form Data
  const [formData, setFormData] = useState({ email: '', password: '', name: '', newPassword: '' });
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- HANDLERS ---

  const handleAuth = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ 
              action: step, // 'login' or 'signup'
              email: formData.email, 
              password: formData.password, 
              name: formData.name 
          })
        });
        const data = await res.json();
        
        if (res.ok) {
            if (data.verify) setStep('verify');
            else { router.push('/dashboard'); router.refresh(); }
        } else {
            if (res.status === 403 && data.verify) setStep('verify');
            else alert(data.error);
        }
    } catch (e) { alert("Connection Error"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true);
    const res = await fetch('/api/auth/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'verify', email: formData.email, code: otp })
    });
    if (res.ok) { router.push('/dashboard'); router.refresh(); }
    else { alert((await res.json()).error); }
    setLoading(false);
  };

  const handleForgotRequest = async () => {
      setLoading(true);
      const res = await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'forgot-password', email: formData.email })
      });
      if (res.ok) { 
          alert("Code sent to your email!"); 
          setStep('reset'); 
      } else { 
          alert((await res.json()).error); 
      }
      setLoading(false);
  };

  const handleResetSubmit = async () => {
      setLoading(true);
      const res = await fetch('/api/auth/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'reset-password', email: formData.email, code: otp, newPassword: formData.newPassword })
      });
      if (res.ok) { 
          alert("Password Reset! Please Login."); 
          setStep('login'); 
          setFormData({...formData, password: ''}); // clear fields
      } else { 
          alert((await res.json()).error); 
      }
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

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-brand-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 scale-150"><Logo /></div>
      <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#000]">
        
        {/* LOGIN & SIGNUP VIEW */}
        {(step === 'login' || step === 'signup') && (
            <>
                <h2 className="text-3xl font-black mb-6 text-center">{step === 'login' ? "Welcome Back!" : "Create Account"}</h2>
                <div className="space-y-4">
                    {step === 'signup' && (
                        <Input placeholder="Full Name" value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} />
                    )}
                    <Input placeholder="Email Address" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
                    <Input type="password" placeholder="Password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} />
                    
                    <Button className="w-full" onClick={handleAuth} disabled={loading}>
                        {loading ? "Processing..." : (step === 'login' ? "Login" : "Sign Up & Verify")}
                    </Button>
                    
                    <div className="flex justify-between mt-4 text-sm font-bold text-gray-500">
                        {step === 'login' && (
                            <span className="cursor-pointer hover:text-black underline" onClick={() => setStep('forgot')}>
                                Forgot Password?
                            </span>
                        )}
                        <span className="cursor-pointer hover:text-black underline ml-auto" onClick={() => setStep(step === 'login' ? 'signup' : 'login')}>
                            {step === 'login' ? "Need an account?" : "Have an account?"}
                        </span>
                    </div>
                </div>
            </>
        )}

        {/* VERIFY EMAIL VIEW */}
        {step === 'verify' && (
            <>
                <h2 className="text-3xl font-black mb-2 text-center">Verify Email</h2>
                <p className="text-center text-gray-600 mb-6">Code sent to <strong>{formData.email}</strong></p>
                
                <div className="space-y-4">
                    <input className="w-full p-4 text-center text-3xl font-black tracking-[10px] border-4 border-black rounded-xl"
                        maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    
                    <Button className="w-full" onClick={handleVerify} disabled={loading}>{loading ? "Verifying..." : "Confirm"}</Button>
                    
                    <div className="flex justify-between mt-2">
                        <button onClick={handleResend} className="text-xs font-bold underline text-gray-500">Resend Code</button>
                        <button onClick={() => setStep('login')} className="text-xs font-bold underline text-gray-500">Back to Login</button>
                    </div>
                </div>
            </>
        )}

        {/* FORGOT PASSWORD (EMAIL) VIEW */}
        {step === 'forgot' && (
            <>
                <h2 className="text-2xl font-black mb-4 text-center">Reset Password</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">Enter your verified email address.</p>
                <div className="space-y-4">
                    <Input placeholder="Email Address" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} />
                    <Button className="w-full" onClick={handleForgotRequest} disabled={loading}>{loading ? "Sending..." : "Send Reset Code"}</Button>
                    <button onClick={() => setStep('login')} className="w-full text-center text-xs font-bold underline text-gray-500 mt-2">Cancel</button>
                </div>
            </>
        )}

        {/* RESET PASSWORD (CODE + NEW PASS) VIEW */}
        {step === 'reset' && (
            <>
                <h2 className="text-2xl font-black mb-4 text-center">Set New Password</h2>
                <div className="space-y-4">
                    <input className="w-full p-3 text-center text-2xl font-black tracking-[5px] border-4 border-black rounded-xl"
                        maxLength={6} placeholder="CODE" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    
                    <Input type="password" placeholder="New Password" value={formData.newPassword} onChange={(e:any) => setFormData({...formData, newPassword: e.target.value})} />
                    
                    <Button className="w-full bg-accent-pink text-white border-accent-pink" onClick={handleResetSubmit} disabled={loading}>
                        {loading ? "Updating..." : "Change Password"}
                    </Button>
                    <button onClick={() => setStep('login')} className="w-full text-center text-xs font-bold underline text-gray-500 mt-2">Cancel</button>
                </div>
            </>
        )}

      </Card>
    </div>
  );
}