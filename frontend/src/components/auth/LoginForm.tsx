import { Lock, User } from "lucide-react";
import FormInput from "./FormInput";

export default function LoginForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
        e.preventDefault();

        console.log("Login Request");
    }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <FormInput
        label="Username or Official Email"
        placeholder="j.doe@spc.gov.lk"
        icon={<User size={18} />}
      />

      <FormInput
        label="Password"
        type="password"
        icon={<Lock size={18} />}
      />

      <div className="flex items-center gap-2">
        <input type="checkbox" />
        <span className="text-sm">
          Remember this workstation
        </span>
      </div>

      <button
        type="submit"
        className="
          w-full
          rounded-md
          bg-[var(--color-primary)]
          py-3
          font-semibold
          text-white
        "
      >
        Sign In
      </button>

      <hr />

      <button
        type="button"
        className="
          w-full
          text-sm
          font-semibold
          text-blue-700
        "
      >
        Request Access from Administrator
      </button>
    </form>
  );
}