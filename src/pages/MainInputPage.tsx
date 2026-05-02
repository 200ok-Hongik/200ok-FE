import { useState } from "react";
import type { InputData, Result } from "../types/recycle";

type Props = {
  onSubmit: (data: InputData, result: Result) => void;
};

const MainInputPage = ({ onSubmit }: Props) => {
  const [image, setImage] = useState<File | null>(null);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [item, setItem] = useState("");
  const [hasLabel, setHasLabel] = useState(false);
  const [hasLeftover, setHasLeftover] = useState(false);
  const [hasCap, setHasCap] = useState(false);

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

  const itemOptions = [
    { label: "투명 페트병", value: "CLEAR_PET_BOTTLE" },
    { label: "캔", value: "CAN" },
    { label: "유리병", value: "GLASS_BOTTLE" },
    { label: "플라스틱 용기", value: "PLASTIC_CONTAINER" },
  ];

  const getResult = (): Result => {
    if (item === "CLEAR_PET_BOTTLE") {
      if (hasLabel && hasLeftover) {
        return {
          judgement: "지금 바로 배출 불가",
          actions: [
            "내용물을 비우기",
            "라벨 제거하기",
            "투명 페트병으로 별도배출하기",
          ],
          method: "투명 페트병 별도배출",
          reason:
            "투명 페트병은 내용물을 비우고 라벨을 제거한 뒤 배출해야 합니다.",
        };
      }

      if (hasLabel) {
        return {
          judgement: "지금 바로 배출 불가",
          actions: ["라벨 제거하기", "투명 페트병으로 별도배출하기"],
          method: "투명 페트병 별도배출",
          reason:
            "라벨이 붙어 있는 투명 페트병은 라벨을 제거한 뒤 배출해야 합니다.",
        };
      }

      if (hasLeftover) {
        return {
          judgement: "지금 바로 배출 불가",
          actions: ["내용물을 비우고 헹구기", "투명 페트병으로 별도배출하기"],
          method: "투명 페트병 별도배출",
          reason:
            "내용물이 남아 있으면 재활용 품질이 떨어질 수 있어 비운 뒤 배출해야 합니다.",
        };
      }

      return {
        judgement: "배출 가능",
        actions: ["가능하면 압착하기", "투명 페트병으로 별도배출하기"],
        method: "투명 페트병 별도배출",
        reason:
          "내용물이 비어 있고 라벨이 제거된 투명 페트병은 별도배출할 수 있습니다.",
      };
    }

    return {
      judgement: "추가 확인 필요",
      actions: ["현재는 투명 페트병 기준으로만 판정할 수 있습니다."],
      method: "확인 필요",
      reason: "아직 해당 품목에 대한 규칙이 등록되지 않았습니다.",
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    const data: InputData = {
      region,
      district,
      item,
      hasLabel,
      hasLeftover,
      hasCap,
    };

    onSubmit(data, getResult());
  };

  const isDisabled = !region || !district || !item;

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

          <button className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold text-gray-800 transition hover:bg-gray-50">
            로그인
          </button>
        </header>

        <section className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold text-emerald-600">
            사진 + 지역 + 상태 정보를 함께 확인해요
          </p>
          <h2 className="text-3xl font-extrabold leading-tight text-gray-900">
            사진과 지역 정보를 바탕으로
            <br />
            분리배출 방법을 판정합니다
          </h2>
          <p className="mt-4 text-gray-500">
            AI가 틀릴 수 있으므로 직접 입력값을 함께 확인해주세요.
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
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className="mb-5 w-full rounded-2xl border border-gray-300 bg-white p-4 font-semibold text-gray-800 outline-none"
          >
            <option value="">품목 선택</option>
            {itemOptions.map((itemOption) => (
              <option key={itemOption.value} value={itemOption.value}>
                {itemOption.label}
              </option>
            ))}
          </select>

          <div className="grid gap-3 md:grid-cols-3">
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
                checked={hasLeftover}
                onChange={(e) => setHasLeftover(e.target.checked)}
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
        </section>

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mt-8 w-full rounded-3xl bg-emerald-600 py-5 text-lg font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:bg-gray-300"
        >
          판정 시작하기
        </button>
      </div>
    </main>
  );
};

export default MainInputPage;