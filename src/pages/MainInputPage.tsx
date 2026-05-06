import { useState } from "react";
import type { InputData, ItemCode, Result } from "../types/recycle";
import { requestRecycleResult } from "../utils/recycleApi";

type Props = {
  loginEmail: string | null;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogout: () => void;
  onSubmit: (data: InputData, result: Result) => void;
};

const MainInputPage = ({
  loginEmail,
  onLoginClick,
  onSignupClick,
  onLogout,
  onSubmit,
}: Props) => {
  const [image, setImage] = useState<File | null>(null);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [itemCode, setItemCode] = useState<ItemCode | "">("");

  const [isTransparent, setIsTransparent] = useState<boolean | null>(null);
  const [hasLabel, setHasLabel] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasCap, setHasCap] = useState(false);

  const [isCrushed, setIsCrushed] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [isContaminated, setIsContaminated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const districtOptions: Record<string, { label: string; value: string }[]> = {
    SEOUL: [
      { label: "마포구", value: "MAPO" },
      { label: "강남구", value: "GANGNAM" },
    ],
    GYEONGGI: [
      { label: "용인시", value: "YONGIN" },
      { label: "성남시", value: "SEONGNAM" },
    ],
  };

  const itemOptions: { label: string; value: ItemCode }[] = [
    { label: "페트병", value: "PET_BOTTLE" },
    { label: "캔", value: "CAN" },
    { label: "유리병", value: "GLASS_BOTTLE" },
    { label: "플라스틱 용기", value: "PLASTIC_CONTAINER" },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const resetConditions = () => {
    setIsTransparent(null);
    setHasLabel(false);
    setIsEmpty(true);
    setHasCap(false);
    setIsCrushed(false);
    setIsBroken(false);
    setIsContaminated(false);
  };

  const handleSubmit = async () => {
    if (!itemCode) return;
    if (itemCode === "PET_BOTTLE" && isTransparent === null) return;

    const inputData: InputData = {
      regionCode: `${region}_${district}`,
      region,
      district,
      itemCode,
      isTransparent: isTransparent ?? false,
      hasLabel,
      isEmpty,
      hasCap,
      isCrushed,
      isBroken,
      isContaminated,
    };

    try {
      setIsLoading(true);

      const result = await requestRecycleResult(inputData);

      onSubmit(inputData, result);
    } catch (error) {
      console.error(error);
      alert("서버 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled =
    isLoading ||
    !region ||
    !district ||
    !itemCode ||
    (itemCode === "PET_BOTTLE" && isTransparent === null);

  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-4xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-100 md:p-10">
        <header className="mb-10 flex items-center justify-between border-b border-gray-200 pb-6">
          <div>
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              Recycle Guide
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-gray-900">
              분리배출 판정 시스템
            </h1>
          </div>

          {loginEmail ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600">
                {loginEmail}
              </span>
              <button
                onClick={onLogout}
                className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onLoginClick}
                className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                로그인
              </button>

              <button
                onClick={onSignupClick}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
              >
                회원가입
              </button>
            </div>
          )}
        </header>

        <section className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold text-emerald-600">
            품목에 따라 필요한 상태 정보를 다르게 입력해요
          </p>
          <h2 className="text-3xl font-extrabold leading-tight text-gray-900">
            지역과 품목 상태를 바탕으로
            <br />
            분리배출 방법을 판정합니다
          </h2>
          <p className="mt-4 text-gray-500">
            페트병은 무색 투명 여부를 먼저 확인하고, 다른 품목은 각 품목에 맞는
            상태 조건을 확인합니다.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 font-bold text-gray-900">📷 사진 업로드</h3>

            <label className="flex h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-4 text-center text-gray-500">
              <div className="mb-3 text-4xl">🖼️</div>
              <div className="font-semibold text-gray-700">
                {image ? image.name : "이미지를 업로드해주세요"}
              </div>
              <p className="mt-1 text-sm text-gray-400">
                지금은 직접 입력만으로도 판정할 수 있어요
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 font-bold text-gray-900">📍 지역 선택</h3>

            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setDistrict("");
              }}
              className="mb-4 w-full rounded-2xl border border-gray-300 bg-white p-4 font-semibold text-gray-800 outline-none"
            >
              <option value="">시/도 선택</option>
              <option value="SEOUL">서울시</option>
              <option value="GYEONGGI">경기도</option>
            </select>

            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!region}
              className="w-full rounded-2xl border border-gray-300 bg-white p-4 font-semibold text-gray-800 outline-none disabled:bg-gray-100"
            >
              <option value="">시/군/구 선택</option>
              {districtOptions[region]?.map((districtOption) => (
                <option key={districtOption.value} value={districtOption.value}>
                  {districtOption.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 font-bold text-gray-900">✍️ 직접 입력</h3>

          <select
            value={itemCode}
            onChange={(e) => {
              const selectedValue = e.target.value as ItemCode | "";
              setItemCode(selectedValue);
              resetConditions();
            }}
            className="mb-5 w-full rounded-2xl border border-gray-300 bg-white p-4 font-semibold text-gray-800 outline-none"
          >
            <option value="">품목 선택</option>
            {itemOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {itemCode === "PET_BOTTLE" && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="petType"
                    checked={isTransparent === true}
                    onChange={() => setIsTransparent(true)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  무색 투명 페트병
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="petType"
                    checked={isTransparent === false}
                    onChange={() => setIsTransparent(false)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  유색 / 불투명 페트병
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={hasLabel}
                    onChange={(e) => setHasLabel(e.target.checked)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  라벨 있음
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!isEmpty}
                    onChange={(e) => setIsEmpty(!e.target.checked)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  내용물 남음
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={hasCap}
                    onChange={(e) => setHasCap(e.target.checked)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  뚜껑 있음
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-700">
                무색 투명 생수·음료 페트병은 투명 페트병 별도배출 대상이고,
                유색 페트병이나 그 외 플라스틱 용기는 일반 플라스틱류로
                배출합니다.
              </div>
            </>
          )}
        </section>

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mt-8 w-full rounded-3xl bg-emerald-600 py-5 text-lg font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:bg-gray-300"
        >
          {isLoading ? "판정 중..." : "판정 시작하기"}
        </button>
      </div>
    </main>
  );
};

export default MainInputPage;