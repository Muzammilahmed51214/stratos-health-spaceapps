export default function Footer() {
  return (
    <footer className="h-8 shrink-0 bg-slate-900/30 border-t border-slate-800/30 flex items-center justify-center px-6 select-none">
      <p className="text-[10px] text-slate-600 tracking-wide">
        Data sourced from{" "}
        <span className="text-slate-500 hover:text-cyan-400/80 transition-colors cursor-default">
          NASA TEMPO
        </span>{" "}
        •{" "}
        <span className="text-slate-500 hover:text-cyan-400/80 transition-colors cursor-default">
          NASA SEDAC
        </span>{" "}
        •{" "}
        <span className="text-slate-500 hover:text-cyan-400/80 transition-colors cursor-default">
          EPA AirNow
        </span>
        <span className="mx-3 text-slate-700">|</span>
        <span className="text-slate-600">StratosHealth © 2024</span>
      </p>
    </footer>
  );
}
