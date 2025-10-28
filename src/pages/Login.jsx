import React from 'react'
import BackButton from '../components/BackButton.jsx'
import { login } from '../services/auth.js'

export default function Login({ onBack, onSignup, onSuccess }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleLogin = async () => {
    setError('')
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요.')
      return
    }
    try {
      setLoading(true)
      await login({ email, password })
      onSuccess?.()
    } catch (e) {
      setError(e?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <BackButton onClick={onBack} />
      <div className="login-header">
        <img className="login-logo" src="/images/logo.png" alt="FLOORIDA" />
        <div className="login-tagline">매일 성장하는 당신의 학습 동반자</div>
      </div>
      <div className="login-surface">
        <div className="login-card">
          <h2 className="login-title">로그인</h2>
          <p className="login-subtitle">플로리다에 오신 것을 환영합니다!</p>
          <label className="login-label">아이디</label>
          <input className="login-input" type="email" placeholder="name1234@naver.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <label className="login-label">비밀번호</label>
          <input className="login-input" type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') handleLogin() }} />
          {error && <div style={{color:'#ef4444', fontSize:12, marginTop:8}}>{error}</div>}
          <button className="login-button" onClick={handleLogin} disabled={loading}>{loading ? '로그인 중…' : '플로리다 시작!'}</button>
          <div className="login-footer">
            <span>계정이 없으신가요?</span>
            <a href="#" onClick={(e) => { e.preventDefault(); onSignup() }}>회원가입</a>
          </div>
        </div>
      </div>
    </div>
  )
}
