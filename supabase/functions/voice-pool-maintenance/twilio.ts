import { RejectedPurchase, type OwnedNumber, type PoolNumber, type Quote } from './workflow.ts';
type Json = Record<string, any>;
export class PoolProvider {
  constructor(private sid: string, private token: string, private base: string, private request: typeof fetch = fetch) {}
  private api = 'https://api.twilio.com/2010-04-01';
  private async call(url: string, body?: URLSearchParams): Promise<Json> {
    const response = await this.request(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Basic ${btoa(`${this.sid}:${this.token}`)}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      ...(body ? { body } : {}), signal: AbortSignal.timeout(12_000),
    });
    let data: Json;
    try { data = await response.json(); } catch { throw new Error('Twilio response unreadable; purchase outcome may be uncertain'); }
    if (!response.ok) {
      const message = `Twilio request failed (HTTP ${response.status}, code ${data.code ?? 'unknown'})`;
      if (body && [400,401,403,404,422].includes(response.status) && Number.isInteger(data.code)) throw new RejectedPurchase(message);
      throw new Error(message);
    }
    return data;
  }
  private number(n: Json): OwnedNumber {
    if (n.account_sid !== this.sid) throw new Error('Twilio account mismatch');
    return { sid: n.sid, phone: n.phone_number, friendly: n.friendly_name, voiceUrl: n.voice_url, smsUrl: n.sms_url,
      voice: n.capabilities?.voice === true, sms: n.capabilities?.sms === true, mms: n.capabilities?.mms === true };
  }
  async owned(phone: string): Promise<OwnedNumber | null> {
    const data = await this.call(`${this.api}/Accounts/${this.sid}/IncomingPhoneNumbers.json?${new URLSearchParams({PhoneNumber:phone,PageSize:'50'})}`);
    const matches = (data.incoming_phone_numbers || []).filter((n: Json) => n.phone_number === phone);
    if (matches.length > 1) throw new Error('Ambiguous Twilio number ownership');
    return matches.length ? this.number(matches[0]) : null;
  }
  async quote(pool: PoolNumber[], reservedPhone?: string): Promise<Quote> {
    const prices = await this.call('https://pricing.twilio.com/v1/PhoneNumbers/Countries/AU');
    const mobile = prices.phone_number_prices?.find((p: Json) => p.number_type === 'mobile');
    const amount = Number(mobile?.current_price);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Australian mobile rental price unavailable');
    const cents = Math.ceil(amount * 100 - 1e-8);
    if (cents > 825 || prices.price_unit?.toLowerCase() !== 'usd') throw new Error('Twilio price exceeds the approved US$8.25 per number');
    // Reuse the compliance identity of an existing HTG mobile. Never select an
    // unrelated bundle from the account (which may also serve other businesses).
    let bundle: string | undefined, address: string | undefined;
    const templates = pool.filter(n => /^\+614\d{8}$/.test(n.number) && n.twilio_sid)
      .sort((a,b) => Number(b.status === 'active') - Number(a.status === 'active') || Number(b.mms_enabled) - Number(a.mms_enabled));
    for (const template of templates) {
      const existing = await this.call(`${this.api}/Accounts/${this.sid}/IncomingPhoneNumbers/${template.twilio_sid}.json`);
      if (existing.account_sid !== this.sid || existing.phone_number !== template.number) throw new Error('HTG compliance template identity mismatch');
      if (!/^BU[0-9a-f]{32}$/i.test(existing.bundle_sid || '') || !/^AD[0-9a-f]{32}$/i.test(existing.address_sid || '')) continue;
      const compliance = await this.call(`https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/${existing.bundle_sid}`);
      if (compliance.status === 'twilio-approved') { bundle = existing.bundle_sid; address = existing.address_sid; break; }
    }
    if (!bundle || !address) throw new Error('No approved compliance identity is attached to an existing HTG mobile');
    let phone = reservedPhone;
    if (!phone) {
      const candidates = await this.call(`${this.api}/Accounts/${this.sid}/AvailablePhoneNumbers/AU/Mobile.json?${new URLSearchParams({VoiceEnabled:'true',SmsEnabled:'true',PageSize:'20'})}`);
      const eligible = (candidates.available_phone_numbers || []).filter((n: Json) => /^\+614\d{8}$/.test(n.phone_number) && n.capabilities?.voice === true && n.capabilities?.sms === true && n.beta !== true && !pool.some(p => p.number === n.phone_number));
      eligible.sort((a: Json,b: Json) => Number(b.capabilities?.mms === true) - Number(a.capabilities?.mms === true));
      phone = eligible[0]?.phone_number;
    }
    if (!phone) throw new Error('No suitable Australian mobile number is available');
    return { phone, cents, currency: prices.price_unit.toLowerCase(), bundle, address };
  }
  async buy(quote: Quote, id: string): Promise<OwnedNumber> {
    return this.number(await this.call(`${this.api}/Accounts/${this.sid}/IncomingPhoneNumbers.json`, new URLSearchParams({
      PhoneNumber: quote.phone, BundleSid: quote.bundle, AddressSid: quote.address, FriendlyName: `HTG-Replacement-${id}`,
      VoiceUrl: `${this.base}/functions/v1/voice-inbound`, VoiceMethod:'POST',
      SmsUrl: `${this.base}/functions/v1/sms-inbound`, SmsMethod:'POST',
      StatusCallback: `${this.base}/functions/v1/twilio-status`, StatusCallbackMethod:'POST',
    })));
  }
}
