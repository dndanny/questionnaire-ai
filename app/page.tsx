'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Cpu, Trophy, Zap } from 'lucide-react';
import { messages } from '@/contents/messages/en/message';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const t = messages.landing;

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
        if(res.ok) return res.json();
        return null;
    }).then(setUser);
  }, []);

  return (
    <main className="min-h-screen bg-brand-100 font-sans selection:bg-brand-300">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b-4 border-black px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Logo className="text-3xl" />
            <div className="flex gap-4">
                {!user ? (
                    <>
                        <Link href="/join"><Button variant="secondary" className="hidden md:block">{t.nav.enterCode}</Button></Link>
                        <Link href="/auth"><Button>{t.nav.login}</Button></Link>
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        <span className="font-bold hidden md:block">{t.nav.welcome}{user.name}</span>
                        <button 
                            onClick={() => fetch('/api/auth/logout', {method: 'POST'}).then(() => window.location.reload())}
                            className="font-bold text-red-500 underline hover:text-red-700"
                        >
                            {t.nav.logout}
                        </button>
                        <Link href="/dashboard"><Button>{t.nav.dashboard}</Button></Link>
                    </div>
                )}
            </div>
        </div>
      </nav>

      <section className="pt-40 pb-20 px-4 relative overflow-hidden">
         <div className="absolute top-20 right-10 opacity-20 rotate-12 animate-pulse"><Zap size={200} /></div>
         <div className="absolute top-40 left-10 opacity-20 -rotate-12"><Cpu size={150} /></div>

         <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <span className="bg-accent-yellow px-4 py-2 rounded-full border-2 border-black font-black uppercase text-sm tracking-wider mb-6 inline-block transform rotate-2">
                    {t.hero.badge}
                </span>
                <h1 className="text-6xl md:text-8xl font-black text-black leading-tight mb-6 tracking-tighter drop-shadow-sm">
                    {t.hero.title}<br/>
                    <span className="text-brand-500 text-shadow-md">{t.hero.subtitle}</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto font-medium">
                    {t.hero.desc}
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                    <Link href={user ? "/dashboard" : "/auth"}>
                        <Button className="text-xl px-10 py-6 bg-black text-white hover:bg-gray-800 border-none shadow-[8px_8px_0px_0px_#00BCD4] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#00BCD4] transition-all">
                            {user ? t.hero.ctaDashboard : t.hero.ctaPrimary}
                        </Button>
                    </Link>
                    <Link href="/join">
                        <Button variant="secondary" className="text-xl px-10 py-6 border-4">
                            {t.hero.ctaSecondary}
                        </Button>
                    </Link>
                </div>
            </motion.div>
         </div>
      </section>

      <section className="py-20 bg-white border-y-4 border-black">
        <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard icon={<BookOpen size={40} />} title={t.features.card1.title} desc={t.features.card1.desc} color="bg-brand-100" />
                <FeatureCard icon={<Cpu size={40} />} title={t.features.card2.title} desc={t.features.card2.desc} color="bg-accent-yellow" />
                <FeatureCard icon={<Trophy size={40} />} title={t.features.card3.title} desc={t.features.card3.desc} color="bg-accent-pink" />
            </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-brand-500">
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-12 text-shadow-md border-black">{t.howItWorks.title}</h2>
            <div className="space-y-4">
                <Step number="1" text={t.howItWorks.step1} />
                <Step number="2" text={t.howItWorks.step2} />
                <Step number="3" text={t.howItWorks.step3} />
                <Step number="4" text={t.howItWorks.step4} />
            </div>
        </div>
      </section>

      <footer className="bg-black text-white py-12 text-center border-t-4 border-white">
        <Logo className="text-4xl justify-center mb-6 text-white" />
        <p className="opacity-50">{t.footer.copyright}</p>
      </footer>
    </main>
  );
}

const FeatureCard = ({ icon, title, desc, color }: any) => (
    <div className={`p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform ${color}`}>
        <div className="mb-4 bg-white w-fit p-3 rounded-xl border-2 border-black">{icon}</div>
        <h3 className="text-2xl font-black mb-2">{title}</h3>
        <p className="font-medium text-gray-800 leading-relaxed">{desc}</p>
    </div>
);

const Step = ({ number, text }: any) => (
    <div className="bg-white p-6 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] flex items-center gap-6 text-left transform hover:scale-[1.02] transition-transform">
        <div className="text-4xl font-black text-brand-500">#{number}</div>
        <div className="text-xl font-bold text-black">{text}</div>
    </div>
);