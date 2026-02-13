import { supabaseService } from "./src/lib/supabase/service";
async function run() {
  const { data, error } = await supabaseService.from('posts').select('*').limit(1);
  if (error) { console.error(error); return; }
  if (data && data.length > 0) {
    console.log("Posts columns:", Object.keys(data[0]));
    console.log("Sample ID:", data[0].id, typeof data[0].id);
  } else {
    console.log("No data in posts");
  }
}
run();
