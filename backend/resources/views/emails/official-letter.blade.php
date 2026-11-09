<p>{{ $isSinhala ? 'හිතවත් සහභාගිවන්නාණෙනි,' : 'Dear Participant,' }}</p>
<p>{{ $isSinhala ? 'නිල රැස්වීම් ආරාධනා පත්‍රය අමුණා ඇත.' : 'Please find the official meeting invitation attached.' }}</p>
<p><strong>{{ $meeting?->title ?? $document->title }}</strong><br>{{ $isSinhala ? 'දිනය' : 'Date' }}: {{ $meeting?->meeting_date?->format('Y-m-d') }}<br>{{ $isSinhala ? 'වේලාව' : 'Time' }}: {{ $meeting?->start_time }}<br>{{ $isSinhala ? 'ස්ථානය' : 'Venue' }}: {{ $meeting?->location }}</p>
<p>{{ $meeting?->description }}<br>{{ $isSinhala ? 'කරුණාකර සහභාගී වී අමුණා ඇති නිල ලිපිය බලන්න.' : 'Please participate as required and refer to the attached official letter.' }}</p><p>{{ $isSinhala ? 'ස්තුතියි.' : 'Kind regards,' }}<br>Office of the Chief Secretary</p>
