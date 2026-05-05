import { useState } from "react";

type Props = {
  onLogin: (email: string) => void;
  onMoveSignup: () => void;
  onBack: () => void;
};

const LoginPage = ({ onLogin, onMoveSignup, onBack }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      alert("가입된 사용자가 없습니다. 회원가입을 먼저 진행해주세요.");
      return;
    }

    const user = JSON.parse(savedUser);

    if (user.email !== email || user.password !== password) {
      alert("이메일 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loginEmail", email);
    onLogin(email);
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-md rounded-4xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-100">
        <button
          onClick={onBack}
          className="mb-6 rounded-2xl border border-gray-300 px-4 py-2 font-semibold"
        >
          ← 돌아가기
        </button>

        <h1 className="mb-2 text-3xl font-extrabold text-gray-900">로그인</h1>
        <p className="mb-8 text-gray-500">
          이메일과 비밀번호를 입력해주세요.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 p-4 outline-none"
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 p-4 outline-none"
          />

          <button
            onClick={handleLogin}
            disabled={!email || !password}
            className="w-full rounded-3xl bg-emerald-600 py-4 font-extrabold text-white disabled:bg-gray-300"
          >
            로그인
          </button>
        </div>

        <p className="mt-6 text-center text-gray-500">
          아직 계정이 없나요?{" "}
          <button
            onClick={onMoveSignup}
            className="font-bold text-emerald-600"
          >
            회원가입
          </button>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;