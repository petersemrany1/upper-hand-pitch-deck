// Used before service-role writes; never trust a client-supplied rep ID.
export async function bookingActor(db:any):Promise<{id:string;role:string}> {
  const {data,error}=await db.rpc("booking_sales_actor");
  if(error || !data || data.length!==1) throw new Error("Sales access required");
  return data[0];
}
export async function assertExistingBookingAccess(db:any, admin:any, leadId:string) {
  const actor=await bookingActor(db);
  const {data,error}=await admin.from("clinic_appointments").select("id,booking_rep_id").eq("lead_id",leadId).maybeSingle();
  if(error) throw error;
  if(data && actor.role!=="admin" && data.booking_rep_id!==actor.id) throw new Error("You can only manage your own bookings");
  return actor;
}
