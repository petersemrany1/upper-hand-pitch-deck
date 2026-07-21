const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? ""
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY ?? ""
const BOLD_TEMPLATE_ID = 3486637
const BOLD_BLUE = "#2020E8"

const to = process.argv[2] || "seetskd@gmail.com"
const contactName = "Seet"
const clinicName = "Evolved Hair Clinic"
const clinicAddress = "South Perth, Western Australia"
const packName = "Demo — 10 Shows"
const shows = 10
const perShowFee = 800
const totalExGst = shows * perShowFee
const gstAmount = Math.round(totalExGst * 0.1)
const totalIncGst = totalExGst + gstAmount
const agreementDate = new Date().toLocaleDateString("en-AU")

function fmtDollar(n: number) {
  return "$" + Math.round(n).toLocaleString()
}

async function sendContract() {
  if (!RESEND_API_KEY || !LOVABLE_API_KEY || !DOCUSEAL_API_KEY) {
    console.error("Missing RESEND_API_KEY, LOVABLE_API_KEY or DOCUSEAL_API_KEY")
    process.exit(1)
  }

  // 1. Create DocuSeal submission
  const docusealResponse = await fetch("https://api.docuseal.com/submissions", {
    method: "POST",
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: BOLD_TEMPLATE_ID,
      send_email: false,
      submitters: [
        {
          role: "Agency",
          email: "admin@bold-patients.com",
          name: "Bold Patients",
          completed: true,
          values: {
            agreement_date: agreementDate,
            clinic_name: clinicName,
            clinic_address: clinicAddress,
            package_selected: packName,
            num_shows: String(shows),
            per_show_fee: fmtDollar(perShowFee),
            total_fee: fmtDollar(totalExGst),
            gst_amount: fmtDollar(gstAmount),
            total_inc_gst: fmtDollar(totalIncGst),
            agency_date: agreementDate,
          },
        },
        {
          role: "Client",
          email: to,
          name: contactName,
          values: {},
        },
      ],
    }),
  })

  const docusealResult = await docusealResponse.json()

  if (!docusealResponse.ok) {
    console.error("DocuSeal failed:", JSON.stringify(docusealResult, null, 2))
    process.exit(1)
  }

  let signingUrl: string | null = null
  if (Array.isArray(docusealResult)) {
    const clientSub = docusealResult.find((s: any) => s.role?.toLowerCase() === "client")
    if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`
  } else if (docusealResult?.submitters) {
    const clientSub = docusealResult.submitters.find((s: any) => s.role?.toLowerCase() === "client")
    if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`
  }

  if (!signingUrl) {
    console.error("No signing URL found:", JSON.stringify(docusealResult, null, 2))
    process.exit(1)
  }

  // 2. Send branded contract email via Resend
  const firstName = contactName.trim().split(" ")[0] || "there"
  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
    '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',
    '<tr><td style="background:#0f172a;padding:32px 40px;">',
    '<span style="color:#ffffff;font-weight:800;font-size:22px;letter-spacing:-0.02em;">BOLD</span><span style="color:' + BOLD_BLUE + ';font-weight:800;font-size:22px;letter-spacing:-0.02em;"> PATIENTS</span>',
    "</td></tr>",
    '<tr><td style="padding:40px;">',
    '<p style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">Hi ' + firstName + ",</p>",
    '<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Thank you for choosing Bold Patients. Please find your Services Agreement ready for review and signature.</p>',
    '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">Please click the button below to review and sign your agreement. It only takes a few minutes.</p>',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<a href="' + signingUrl + '" style="display:inline-block;background:' + BOLD_BLUE + ';color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Review &amp; Sign Agreement &rarr;</a>',
    "</td></tr></table>",
    '<p style="margin:32px 0 16px;color:#374151;font-size:15px;line-height:1.6;">Once signed we will be in touch to get everything underway.</p>',
    '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">If you have any questions please reply to this email or reach out directly.</p>',
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />',
    '<p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">Bold Patients</p>',
    '<p style="margin:2px 0 0;font-size:13px;"><a href="mailto:admin@bold-patients.com" style="color:' + BOLD_BLUE + ';text-decoration:none;">admin@bold-patients.com</a></p>',
    "</td></tr></table></td></tr></table></body></html>",
  ].join("")

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Bold Patients <admin@bold-patients.com>",
      reply_to: "admin@bold-patients.com",
      to: [to],
      subject: "Your Bold Patients Services Agreement",
      html,
    }),
  })

  const resendResult = await response.json()

  if (!response.ok) {
    console.error("Resend failed:", JSON.stringify(resendResult, null, 2))
    process.exit(1)
  }

  console.log("Contract email sent to", to)
  console.log("Resend id:", resendResult.id)
  console.log("Signing URL:", signingUrl)
}

sendContract().catch((err) => {
  console.error(err)
  process.exit(1)
})
