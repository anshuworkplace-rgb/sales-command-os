import { useEffect, useState } from 'react';
import { Lock, Mail, User, Zap } from 'lucide-react';
import useUserStore from '../../stores/useUserStore';

export default function Auth() {
  const { signIn, signUp, session, initAuth, isLoading, error } = useUserStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password, name);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  if (session) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-void relative overflow-hidden">
      {/* Decorative ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-electric/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-violet/10 blur-[80px] pointer-events-none" />

      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-xl shadow-elevated lg:grid-cols-[1.2fr_1fr] relative z-10">
        {/* Left marketing panel */}
        <section className="hidden bg-void/50 p-10 border-r border-white/5 text-tx-bright lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
          {/* Ambient inside gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-electric/5 via-transparent to-violet/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-blue-700 shadow-glow-electric">
              <Zap size={22} className="text-white" />
            </div>
            <h1 className="mt-8 max-w-md text-4xl font-extrabold leading-tight text-gradient-electric tracking-tight">
              A calmer operating system for faster sales work.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-tx-primary/80">
              Pipeline Studio keeps calls, follow-ups, notes, and next actions in one clean daily workspace.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-xs relative z-10 mt-10">
            <div className="glass-card-flat bg-white/5 border border-white/5 p-4 hover:border-electric/30 hover:bg-white/10 transition-all duration-300">
              <div className="font-extrabold text-tx-bright">Smart queue</div>
              <div className="mt-1 text-tx-primary/70">Priority leads first</div>
            </div>
            <div className="glass-card-flat bg-white/5 border border-white/5 p-4 hover:border-electric/30 hover:bg-white/10 transition-all duration-300">
              <div className="font-extrabold text-tx-bright">Hinglish notes</div>
              <div className="mt-1 text-tx-primary/70">Auto-detect details</div>
            </div>
            <div className="glass-card-flat bg-white/5 border border-white/5 p-4 hover:border-electric/30 hover:bg-white/10 transition-all duration-300">
              <div className="font-extrabold text-tx-bright">Pipeline view</div>
              <div className="mt-1 text-tx-primary/70">Board, table, forecast</div>
            </div>
          </div>
        </section>

        {/* Right form panel */}
        <section className="p-8 sm:p-10 bg-card/25 flex flex-col justify-center">
          <div className="mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-blue-700 text-white shadow-glow-electric">
                <Zap size={20} />
              </div>
              <div>
                <div className="font-extrabold text-tx-bright text-lg leading-none">Sales Command OS</div>
                <div className="text-xs text-tx-dim mt-1">Pipeline Studio</div>
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-extrabold text-tx-bright tracking-tight">
              {isLogin ? 'Sign in' : 'Create account'}
            </h2>
            <p className="mt-2 text-sm text-tx-primary/80">
              {isLogin ? 'Open your sales workspace.' : 'Create a new sales user profile.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <Field icon={User} label="Full name">
                <input className="input-field pl-10" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
              </Field>
            )}

            <Field icon={Mail} label="Email">
              <input className="input-field pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sales@company.com" required />
            </Field>

            <Field icon={Lock} label="Password">
              <input className="input-field pl-10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
            </Field>

            {(error || localError) && (
              <div className="rounded-xl border border-coral/30 bg-coral/10 p-3.5 text-sm font-semibold text-coral shadow-inner-glow">
                {localError || error}
              </div>
            )}

            <button disabled={isLoading} className="btn-primary w-full py-3 disabled:opacity-50 mt-2">
              {isLoading ? 'Connecting...' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/5 pt-5 text-center text-sm text-tx-primary/70">
            {isLogin ? 'Need an account?' : 'Already have an account?'}
            <button type="button" onClick={() => setIsLogin((value) => !value)} className="ml-2 font-extrabold text-electric hover:text-blue-400 hover:underline transition-colors">
              {isLogin ? 'Request access' : 'Sign in'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-widest text-tx-dim">{label}</span>
      <span className="relative block">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tx-dim/70" />
        {children}
      </span>
    </label>
  );
}
