import { motion } from "framer-motion";

export default function GlassButton({
  children,
  className = "",
  backgroundImage,
  ...props
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
      whileTap={{ scale: 0.98 }}
      style={
        backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined
      }
      className={[
        "relative h-[80px] w-[450px] overflow-hidden rounded-full border border-white/10 bg-white/[0.06]",
        "bg-cover bg-center bg-no-repeat font-['Pretendard',sans-serif] text-[24px] font-bold tracking-[-0.02em] text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_24px_rgba(80,0,0,0.2)]",
        "backdrop-blur-lg transition-colors duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      ].join(" ")}
      {...props}
    >
      <span className="intro-button-text relative z-10">{children}</span>
    </motion.button>
  );
}
