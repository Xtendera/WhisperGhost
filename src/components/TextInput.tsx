export default function TextInput({
  inputState,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  inputState: "neutral" | "success" | "fail";
}) {
  return (
    <input
      {...props}
      type="text"
      className={`text-white p-2 rounded-xl bg-[#FFFF]/11 border-2 focus:outline-none ${
        inputState === "neutral"
          ? "border-transparent focus:border-white/50"
          : ""
      } ${inputState === "success" ? "border-green-500" : ""} ${
        inputState === "fail" ? "border-red-500/70" : ""
      }`}
    />
  );
}
