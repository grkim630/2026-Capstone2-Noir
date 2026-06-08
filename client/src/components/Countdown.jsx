export default function Countdown({ value, label }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="rounded-[40px] border border-white/20 bg-black/20 px-12 py-8 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-md">
        <p className="font-pretendard text-[18px] font-medium tracking-[-0.02em] text-white/80">
          {label}
        </p>
        <p className="font-pretendard mt-3 text-[96px] font-bold leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}
