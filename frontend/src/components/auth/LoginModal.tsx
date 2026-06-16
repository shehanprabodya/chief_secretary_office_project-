import LoginForm from "./LoginForm";

interface Props {
  onClose: () => void;
}

export default function LoginModal({
  onClose,
}: Props) {
  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        backdrop-blur-sm
      "
    >
      <div
        className="
          relative
          w-full
          max-w-md
          rounded-xl
          bg-white
          p-10
        "
      >
        <button
          onClick={onClose}
          className="
            absolute
            right-4
            top-4
            text-xl
          "
        >
          ✕
        </button>

        <div className="mb-8 flex justify-center">
          <img
            src="/logo.png"
            alt="logo"
            className="h-24"
          />
        </div>

        <LoginForm />
      </div>
    </div>
  );
}