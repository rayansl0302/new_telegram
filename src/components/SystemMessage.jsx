function SystemMessage({ message }) {
  return (
    <div className="flex justify-center my-1">
      <p className="bg-slate-800/60 text-slate-400 text-xs px-3 py-1 rounded-full max-w-[80%] text-center">
        {message.text}
      </p>
    </div>
  );
}

export default SystemMessage;
