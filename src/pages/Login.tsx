import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Package, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const { login, loading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
    return () => clearError();
  }, [isAuthenticated, navigate, clearError]);

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    }
    if (!password.trim()) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码长度不能少于6位';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(username.trim(), password.trim());
      navigate('/dashboard', { replace: true });
    } catch {
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')`
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-white/5 to-transparent rounded-full" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-2xl animate-pulse-soft">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center animate-slide-up">
            企业采购与供应商协同管理平台
          </h1>
          <p className="text-lg text-white/80 text-center max-w-md mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
            全流程数字化采购管理，智能供应商协同，助力企业采购供应链转型升级
          </p>

          <div className="grid grid-cols-3 gap-8 w-full max-w-lg animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm text-white/70 mt-1">准时交付率</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-3xl font-bold">30%</p>
              <p className="text-sm text-white/70 mt-1">成本节约</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-3xl font-bold">200+</p>
              <p className="text-sm text-white/70 mt-1">优质供应商</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-neutral-50 to-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 shadow-xl shadow-primary-500/30">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-800">企业采购与供应商协同管理平台</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-neutral-200/50 p-8 border border-neutral-100 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-800">欢迎登录</h2>
              <p className="text-neutral-500 mt-2">请输入您的账号信息</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors({ ...errors, username: undefined });
                    }}
                    placeholder="请输入用户名"
                    className={cn(
                      'form-input pl-10 pr-4 py-2.5',
                      errors.username && 'border-danger-500 focus:ring-danger-500'
                    )}
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1.5 text-xs text-danger-500 flex items-center gap-1">
                    <span>{errors.username}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    placeholder="请输入密码"
                    className={cn(
                      'form-input pl-10 pr-12 py-2.5',
                      errors.password && 'border-danger-500 focus:ring-danger-500'
                    )}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-danger-500 flex items-center gap-1">
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-600 animate-fade-in">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-neutral-600">记住我</span>
                </label>
                <a href="#" className="text-primary-600 hover:text-primary-700 transition-colors">
                  忘记密码？
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full btn-primary py-3 rounded-xl text-base font-medium flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
                  'shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40',
                  'transform hover:-translate-y-0.5 transition-all duration-200',
                  loading && 'opacity-70 cursor-not-allowed hover:translate-y-0'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-neutral-100">
              <p className="text-xs text-center text-neutral-400">
                登录即表示您同意我们的
                <a href="#" className="text-primary-600 hover:underline mx-1">服务条款</a>
                和
                <a href="#" className="text-primary-600 hover:underline mx-1">隐私政策</a>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-400">
              © 2024 企业采购与供应商协同管理平台. 保留所有权利.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
