export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}) {
  return (
    <button
      {...props}
      className="rounded-lg cursor-pointer disabled:cursor-auto bg-purple-700 hover:bg-purple-800 transition-colors duration-300 shadow-md disabled:bg-gray-500 font-bold font-roboto p-3"
      type="submit"
    >
      {children}
    </button>
  );
}
