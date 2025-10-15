export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}) {
  return (
    <button
      {...props}
      className="rounded-lg cursor-pointer bg-purple-700 shadow-2xl shadow-purple-700 disabled:bg-gray-500 font-bold font-roboto p-3"
      type="submit"
    >
      {children}
    </button>
  );
}
