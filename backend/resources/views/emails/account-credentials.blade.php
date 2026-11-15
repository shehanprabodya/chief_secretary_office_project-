<!doctype html>
<html lang="{{ $isSinhala ? 'si' : 'en' }}">
<body style="margin:0;background:#f3f6fb;padding:24px;font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
	<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:12px;overflow:hidden;">
		<tr>
			<td style="padding:22px 24px;background:#0f3d73;color:#ffffff;">
				<div style="font-size:15px;font-weight:700;letter-spacing:0.2px;">{{ $applicationName }}</div>
				<div style="margin-top:4px;font-size:13px;opacity:0.95;">Office of the Chief Secretary - Southern Provincial Council</div>
			</td>
		</tr>

		<tr>
			<td style="padding:24px;">
				@if($isSinhala)
					<p style="margin:0 0 14px 0;">හිතවත් {{ $user->displayNameSinhala() }},</p>
					<p style="margin:0 0 14px 0;">
						ඔබගේ {{ $applicationName }} ගිණුම සාර්ථකව ලියාපදිංචි කර ඇත. පළමු වරට පද්ධතියට පිවිසීමට පහත තාවකාලික පිවිසුම් තොරතුරු භාවිතා කරන්න.
					</p>
				@else
					<p style="margin:0 0 14px 0;">Dear {{ $user->full_name }},</p>
					<p style="margin:0 0 14px 0;">
						Your account for the {{ $applicationName }} has been created successfully. Please use the temporary credentials below for your first sign-in.
					</p>
				@endif

				<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #d9e2ef;border-radius:10px;background:#f8fbff;">
					<tr>
						<td style="padding:14px 16px;border-bottom:1px solid #d9e2ef;">
							<strong>{{ $isSinhala ? 'සම්පූර්ණ නම' : 'Full Name' }}:</strong> {{ $isSinhala ? $user->displayNameSinhala() : $user->full_name }}
						</td>
					</tr>
					<tr>
						<td style="padding:14px 16px;border-bottom:1px solid #d9e2ef;">
							<strong>{{ $isSinhala ? 'පරිශීලක නාමය' : 'Username' }}:</strong> {{ $user->username }}
						</td>
					</tr>
					<tr>
						<td style="padding:14px 16px;border-bottom:1px solid #d9e2ef;">
							<strong>{{ $isSinhala ? 'ලියාපදිංචි ඊමේල් ලිපිනය' : 'Registered Email Address' }}:</strong> {{ $user->email }}
						</td>
					</tr>
					<tr>
						<td style="padding:14px 16px;">
							<strong>{{ $isSinhala ? 'තාවකාලික මුරපදය' : 'Temporary Password' }}:</strong>
							<span style="display:inline-block;margin-left:6px;padding:3px 8px;border-radius:6px;background:#fff3d6;color:#7c2d12;font-weight:700;letter-spacing:0.3px;">{{ $temporaryPassword }}</span>
						</td>
					</tr>
				</table>

				<div style="margin:18px 0 0 0;padding:14px 16px;background:#fff4f4;border:1px solid #f7caca;border-radius:10px;color:#7f1d1d;">
					<strong>{{ $isSinhala ? 'වැදගත්:' : 'Important:' }}</strong>
					{{ $isSinhala
						? 'පළමු වරට පිවිසීමෙන් පසු වහාම මෙම තාවකාලික මුරපදය වෙනස් කළ යුතුය. මුරපදය වෙනස් කරන තෙක් පද්ධතියේ සාමාන්‍ය පිටු වෙත ප්‍රවේශ වීමට නොහැක.'
						: 'You must change this temporary password immediately after your first sign-in. You will not be able to access normal application features until the password is changed.' }}
				</div>

				<div style="margin-top:22px;">
					<a href="{{ $loginUrl }}" style="display:inline-block;background:#0f3d73;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;">
						{{ $isSinhala ? 'පද්ධතියට පිවිසෙන්න' : 'Go to Login Page' }}
					</a>
				</div>

				<p style="margin:18px 0 0 0;color:#475569;font-size:13px;">
					{{ $isSinhala
						? 'ආරක්ෂක හේතූන් මත, මෙම පිවිසුම් තොරතුරු වෙනත් කෙනෙකු සමඟ බෙදා නොගන්න.'
						: 'For security reasons, do not share these credentials with anyone.' }}
				</p>
			</td>
		</tr>

		<tr>
			<td style="padding:16px 24px;border-top:1px solid #e5eaf2;background:#f8fafc;color:#64748b;font-size:12px;">
				{{ $isSinhala ? 'මෙය ස්වයංක්‍රීයව ජනනය වූ පණිවිඩයකි.' : 'This is an automatically generated message.' }}
			</td>
		</tr>
	</table>
</body>
</html>
