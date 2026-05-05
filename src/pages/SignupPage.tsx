import { useState } from "react";

type Props = {
  onSignupComplete: () => void;
  onBack: () => void;
};

const SignupPage = ({ onSignupComplete, onBack }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const isPasswordValid = hasMinLength && hasLetter && hasNumber;
  const isPasswordSame = password !== "" && password === passwordCheck;

  const handleSignup = () => {
    if (!isPasswordValid) {
      alert("비밀번호 조건을 모두 만족해야 합니다.");
      return;
    }

    if (!isPasswordSame) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const user = {
      name,
      email,
      password,
    };

    localStorage.setItem("user", JSON.stringify(user));
    alert("회원가입 완료!");
    onSignupComplete();
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-md rounded-4xl bg-white p-8 shadow-xl">
        <button
          onClick={onBack}
          className="mb-6 rounded-2xl border px-4 py-2 font-semibold hover:bg-gray-50"
        >
          ← 돌아가기
        </button>

        <h1 className="mb-2 text-3xl font-extrabold">회원가입</h1>
        <p className="mb-6 text-gray-500">
          사용할 계정 정보를 입력해주세요.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border p-4"
          />

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border p-4"
          />

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border p-4 pr-14"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="mt-3 space-y-1 text-sm font-semibold">
              <p className={hasMinLength ? "text-emerald-600" : "text-gray-400"}>
                {hasMinLength ? "✔" : "○"} 8자 이상
              </p>
              <p className={hasLetter ? "text-emerald-600" : "text-gray-400"}>
                {hasLetter ? "✔" : "○"} 영문 포함
              </p>
              <p className={hasNumber ? "text-emerald-600" : "text-gray-400"}>
                {hasNumber ? "✔" : "○"} 숫자 포함
              </p>
            </div>
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호 확인"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.target.value)}
                className="w-full rounded-2xl border p-4 pr-14"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {passwordCheck && (
              <p
                className={`mt-2 text-sm font-semibold ${
                  isPasswordSame ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {isPasswordSame
                  ? "✔ 비밀번호가 일치합니다"
                  : "✘ 비밀번호가 일치하지 않습니다"}
              </p>
            )}
          </div>

          <button
            onClick={handleSignup}
            disabled={
              !name ||
              !email ||
              !password ||
              !passwordCheck ||
              !isPasswordValid ||
              !isPasswordSame
            }
            className="w-full rounded-3xl bg-emerald-600 py-4 font-bold text-white disabled:bg-gray-300"
          >
            회원가입
          </button>
        </div>
      </div>
    </main>
  );
};

export default SignupPage;