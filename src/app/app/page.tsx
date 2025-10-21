export default function App() {
  return (
    <div className="flex flex-col items-center justify-between w-screen h-screen">
      <div className="border-b border-white/20 w-screen p-2 flex items-center justify-center">
        <div className="flex flex-col">
          <span className="text-white/60 font-roboto-flex">RECIPIENT</span>
          <div>
            <span className="text-2xl text-center">otheruser</span>
            <button type="button" className="ml-3 p-2 bg-wg-purple rounded-xl">Change</button>
          </div>
        </div>
      </div>
      <div className="p-4 w-screen h-screen space-y-2">
        <div className="flex flex-col">
          <span className="font-semibold">xtendera</span>
          <span>Test 123</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">otheruser</span>
          <span>Wow it works!</span>
        </div>
      </div>
      <div className="w-screen p-4 border-t border-white/20">
        <input
          className="p-4 border rounded-xl w-full focus:outline-none"
          placeholder="Message otheruser..."
        />
      </div>
    </div>
  );
}
