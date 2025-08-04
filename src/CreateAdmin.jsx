import bcrypt from "bcryptjs";
import { supabase } from "./lib/supabaseClient";

export default function CreateAdmin() {
  const handleCreate = async () => {
    const email = "kpraisekolawole@gmail.com"; // change this
    const password = "SuperSecret123"; // change this

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const { error } = await supabase.from("admin_users").insert([
      { email, password_hash: hash }
    ]);

    if (error) {
      console.error("Error creating admin:", error);
    } else {
      console.log("✅ Admin created successfully");
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>Create Admin</button>
    </div>
  );
}
