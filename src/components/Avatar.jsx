function Avatar({ src, name, size = 40 }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-semibold flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
