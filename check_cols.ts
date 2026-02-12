import { supabaseService } from "./src/lib/supabase/service";

async function run() {
  const { data, error } = await supabaseService.from('new_students').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No data in new_students to check columns.");
    // Try to get from view if table is empty
    const { data: vData } = await supabaseService.from('v_students_full').select('*').limit(1);
    if (vData && vData.length > 0) {
      console.log("v_students_full Columns:", Object.keys(vData[0]));
    }
  }
}
run();
