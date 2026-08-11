# M14 · DSA — ma'lumotnoma

> ⚠ **Bu fayl `patterns.md` ni ALMASHTIRMAYDI.**
>
> `patterns.md` — sizning **o'z so'zingiz bilan** yozadigan joyingiz, va u
> qoidasi bo'yicha bu yerdan ko'chirilmasligi kerak.
>
> Bu fayl — **tekshirish uchun**: masalani o'zingiz yechgandan keyin shablon va
> murakkablikni solishtirasiz. Avval o'zingiz, keyin bu yer.

**Yengil filtr.** ~50 masala yetadi. Maqsad — o'tish, porlash emas. Har yechim
**test bilan** va tepasida **complexity kommenti** bilan yopiladi.

| # | Pattern | Masala |
|---|---|---|
| [14.1](#141--big-o-va-tanlov) | Big-O va tanlov | — |
| [14.2](#142--arrays--hashing) | Arrays & Hashing | 4 |
| [14.3](#143--two-pointers) | Two Pointers | 3 |
| [14.4](#144--sliding-window) | Sliding Window | 4 |
| [14.5](#145--stack) | Stack | 3 |
| [14.6](#146--binary-search) | Binary Search | 4 |
| [14.7](#147--linked-list) | Linked List | 4 |
| [14.8](#148--trees) | Trees | 6 |
| [14.9](#149--heap) | Heap | 3 |
| [14.10](#1410--backtracking) | Backtracking | 4 |
| [14.11](#1411--graphs) | Graphs | 5 |
| [14.12](#1412--dynamic-programming) | Dynamic Programming | 5 |
| [14.13](#1413--intervals) | Intervals | 3 |
| [14.14](#1414--mavjud-yechimlarni-qayta-korish-) | Mavjud yechimlarni qayta ko'rish ⭐ | 65 |

---

# 14.1 · Big-O va tanlov

| Murakkablik | n = 1000 | Misol |
|---|---|---|
| O(1) | 1 | Hash kirish, massiv indeksi |
| O(log n) | ~10 | Binary search, balanslangan daraxt |
| O(n) | 1 000 | Bitta o'tish |
| O(n log n) | ~10 000 | Saralash |
| O(n²) | 1 000 000 | Ichma-ich sikl |
| O(2ⁿ) | — | Memoizatsiyasiz rekursiya |

```
   ⚠ ASOSIY QOIDA: ICHMA-ICH SIKL ko'rsangiz — deyarli har doim
     hash jadval bilan bir darajaga tushirish mumkin: O(n²) → O(n)
```

```csharp
// ❌ O(n·m)                          // ✅ O(n + m)
foreach (var a in list)               var map = list.ToDictionary(x => x.Id);
    if (list.Any(b => b.Id == a.Pair)) foreach (var a in list)
                                           if (map.ContainsKey(a.Pair))
```

## Trade-off aytish

```
   Two Sum:
   · O(n²) vaqt, O(1) xotira   — ichma-ich sikl
   · O(n) vaqt, O(n) xotira    — hash jadval

   → Intervyuda IKKALASINI ham ayting va tanlovni asoslang
```

**«Yechimingizning murakkabligi qanday?»** ⭐

> Vaqt va xotira **alohida**, va nima hisobiga.
>
> «Bir marta massivdan o'taman — O(n) vaqt. Hash jadval qurdim — O(n) qo'shimcha
> xotira. Xotirani O(1) qilish mumkin edi, lekin unda saralash kerak va O(n log n)
> chiqadi.»
>
> **Trade-off'ni aytish yechimning o'zidan qimmatliroq.**

**«Tezroq qila olasizmi?»** — odatdagi yo'nalishlar:
ichma-ich sikl → hash · saralangan → two pointers/binary search · takroriy hisob →
memo · «top K» → heap. Bo'lmasa — **nega** bo'lmasligini tushuntiring (O(n) quyi
chegara).

---

# 14.2 · Arrays & Hashing

**Belgilar:** «bormi?» · «nechta?» · takrorlanish · guruhlash
**Vosita:** `HashSet` (mavjudlik) · `Dictionary` (hisob, guruh)

```csharp
// Ko'rilganlarni eslab qolish
var seen = new HashSet<int>();
foreach (var x in nums) { if (seen.Contains(target - x)) return true; seen.Add(x); }

// Guruhlash — kalitni HISOBLASH
var key = new string(word.OrderBy(c => c).ToArray());   // anagram kaliti
```

**Masalalar:** Two Sum · Group Anagrams · Top K Frequent · Longest Consecutive

```csharp
// ⚠ Longest Consecutive — masala O(n) TALAB QILADI, saralash yaramaydi
public static int LongestConsecutive(int[] nums)
{
    var set = new HashSet<int>(nums);
    int longest = 0;

    foreach (var n in set)
    {
        if (set.Contains(n - 1)) continue;      // ⚠ FAQAT ketma-ketlik BOSHIDAN

        int length = 1;
        while (set.Contains(n + length)) length++;
        longest = Math.Max(longest, length);
    }

    return longest;   // O(n) vaqt, O(n) xotira
}
```

> **Sizning mavjud yechimingiz** `Distinct().OrderBy()` ishlatadi — O(n log n) va
> masalaning asosiy g'oyasini o'tkazib yuboradi (14.14).

---

# 14.3 · Two Pointers

**Belgilar:** SARALANGAN massiv · juftlik · palindrom · joyida ishlash

```
   [1] [3] [5] [7] [9] [11]
    ▲                    ▲
   left               right

   sum < target → left++    ·    sum > target → right--
```

```csharp
// Qarama-qarshi uchlar
int left = 0, right = nums.Length - 1;
while (left < right) { /* sum bo'yicha siljitish */ }

// Bir yo'nalish (fast/slow) — dublikatlarni olib tashlash
int slow = 0;
for (int fast = 1; fast < nums.Length; fast++)
    if (nums[fast] != nums[slow]) nums[++slow] = nums[fast];
```

**Masalalar:** Two Sum II · 3Sum · Container With Most Water

```csharp
// ⚠ 3Sum — DUBLIKATLARNI o'tkazib yuborish eng ko'p xato qilinadigan joy
if (i > 0 && nums[i] == nums[i - 1]) continue;                     // tashqi
while (left < right && nums[left] == nums[left + 1]) left++;       // ichki
while (left < right && nums[right] == nums[right - 1]) right--;
```

---

# 14.4 · Sliding Window

**Belgilar:** KETMA-KET qism massiv/satr · «eng uzun»/«eng qisqa» · «k ta bilan»

```
   [a] [b] [c] [a] [d]
    ▲───────▲
   left   right    → kengaytirish HAR iteratsiyada
                   → toraytirish FAQAT shart buzilganda
```

```csharp
int left = 0, best = 0;
var window = new Dictionary<char, int>();

for (int right = 0; right < s.Length; right++)
{
    window[s[right]] = window.GetValueOrDefault(s[right]) + 1;   // 1. kengaytirish

    while (/* shart buzildi */)                                   // 2. toraytirish
    {
        window[s[left]]--;
        if (window[s[left]] == 0) window.Remove(s[left]);
        left++;
    }

    best = Math.Max(best, right - left + 1);                      // 3. natija
}
// Har element ko'pi bilan 2 marta ko'riladi → O(n)
```

**Masalalar:** Longest Substring Without Repeating · Character Replacement ·
Permutation in String · Minimum Window Substring

```csharp
// ⚠ Character Replacement — maxCount ni KAMAYTIRMAYMIZ (to'g'ri va tezroq)
maxCount = Math.Max(maxCount, ++count[s[right] - 'A']);
while (right - left + 1 - maxCount > k) count[s[left++] - 'A']--;
```

**Sobit oyna** («k uzunlikdagi»): oyna to'lganda chapdan bittasini chiqaramiz —
`if (right >= k) Remove(s[right - k]);`

---

# 14.5 · Stack

**Belgilar:** qavslar · «keyingi kattaroq/kichikroq» · ifoda · orqaga qaytish

```csharp
// Monotonic stack — INDEKSLAR saqlanadi
var stack = new Stack<int>();

for (int i = 0; i < nums.Length; i++)
{
    while (stack.Count > 0 && nums[i] > nums[stack.Peek()])
    {
        int index = stack.Pop();
        result[index] = i - index;
    }
    stack.Push(i);
}
// Har element 1 marta push + 1 marta pop → O(n)
```

**Masalalar:** Valid Parentheses · Daily Temperatures · Evaluate RPN

---

# 14.6 · Binary Search

**Ikki shakl:** saralangan massivda qidirish · **javob bo'yicha** qidirish
(shart: predikat monoton).

```csharp
// Aniq element                       // Chegara (eng kichik yaroqli)
while (lo <= hi)                      while (lo < hi)
{                                     {
    int mid = lo + (hi - lo) / 2;         int mid = lo + (hi - lo) / 2;
    if (nums[mid] == target) return mid;  if (Works(mid)) hi = mid;
    if (nums[mid] < target) lo = mid + 1; else lo = mid + 1;
    else hi = mid - 1;                }
}                                     return lo;
return -1;
```

```
   ⚠ Ikki shablon chalkashtirilmasin:
   lo <= hi + return -1   → aniq element
   lo <  hi + return lo   → chegara topish
   mid = lo + (hi - lo)/2 → overflow'dan himoya
```

**Masalalar:** Search in Rotated · Find Minimum in Rotated · **Koko Eating
Bananas** (javob bo'yicha) · Time Based Store

```csharp
// Rotated — qaysi yarim saralangan?
if (nums[lo] <= nums[mid])   // CHAP yarim saralangan
{
    if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
}
else                          // O'NG yarim saralangan
{
    if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
}
```

---

# 14.7 · Linked List

**Belgilar:** fast/slow · teskarilash · birlashtirish · tsikl
**Qoida:** deyarli har doim **dummy node** — bosh element o'zgarishini
soddalashtiradi.

```csharp
// Teskarilash — prev/curr/next uchligi
ListNode? prev = null, curr = head;
while (curr is not null)
{
    var next = curr.next;
    curr.next = prev;
    prev = curr; curr = next;
}
return prev;

// Fast/slow — o'rta element yoki tsikl
while (fast?.next is not null) { slow = slow!.next; fast = fast.next.next;
                                  if (slow == fast) return true; }
```

**Masalalar:** Reverse · Remove Nth From End · Add Two Numbers · Copy Random

```csharp
// Remove Nth — bir o'tishda, fast n+1 qadam oldinda
for (int i = 0; i <= n; i++) fast = fast.next!;
while (fast is not null) { fast = fast.next!; slow = slow.next!; }
slow.next = slow.next!.next;
```

> **LRU Cache** — `Dictionary` + `LinkedList`. Bu fintech keshida ham foydali
> (M11.12).

---

# 14.8 · Trees

```
   DFS: preorder (nusxa) · INORDER (BST → saralangan) · postorder (balandlik)
   BFS: navbat + QATLAM HAJMINI eslab qolish
```

```csharp
// BFS — qatlam bo'yicha
while (queue.Count > 0)
{
    int levelSize = queue.Count;              // ⚠ qatlam hajmi
    for (int i = 0; i < levelSize; i++) { /* ... */ }
}
```

**Masalalar:** Invert · Max Depth · Level Order · **Validate BST** · LCA ·
Right Side View

```csharp
// ⚠ Validate BST — CHEGARALAR uzatiladi
public static bool IsValidBst(TreeNode? node, long min = long.MinValue, long max = long.MaxValue)
{
    if (node is null) return true;
    if (node.val <= min || node.val >= max) return false;
    return IsValidBst(node.left, min, node.val) && IsValidBst(node.right, node.val, max);
}

// ❌ Faqat bevosita bolalarni tekshirish XATO:
//    [5, 1, 6, null, null, 3, 7] uchun noto'g'ri "true" beradi
```

```csharp
// LCA (BST) — ajralish nuqtasi = LCA
if (p.val < node.val && q.val < node.val) node = node.left!;
else if (p.val > node.val && q.val > node.val) node = node.right!;
else return node;
```

---

# 14.9 · Heap

**Belgilar:** «top K» · oqimdagi median · ustuvorlik navbati
**Nega:** saralash O(n log n) → heap **O(n log k)**

```csharp
var minHeap = new PriorityQueue<int, int>();
var maxHeap = new PriorityQueue<int, int>(Comparer<int>.Create((a, b) => b.CompareTo(a)));
```

```csharp
// ⚠ "Eng katta K ta" uchun MIN-heap (hajmi k, eng kichigini chiqaramiz)
foreach (var (num, count) in counts)
{
    heap.Enqueue(num, count);
    if (heap.Count > k) heap.Dequeue();       // O(n log k)
}
```

**Masalalar:** Kth Largest · Top K Frequent · **Median from Data Stream** (ikki
heap: chap yarim max-heap, o'ng yarim min-heap)

---

# 14.10 · Backtracking

**Shablon:** TANLASH → REKURSIYA → **BEKOR QILISH**

```csharp
void Backtrack(List<int> current, int start)
{
    if (IsComplete(current)) { result.Add([.. current]); return; }   // ⚠ NUSXA

    for (int i = start; i < candidates.Length; i++)
    {
        if (!IsValid(candidates[i], current)) continue;              // pruning

        current.Add(candidates[i]);                                   // TANLASH
        Backtrack(current, i + 1);                                    // REKURSIYA
        current.RemoveAt(current.Count - 1);                          // BEKOR QILISH
    }
}
```

```
   ⚠ IKKI TIPIK XATO:
   1. result.Add(current) — NUSXASIZ → hamma element bir xil bo'ladi
   2. RemoveAt ni unutish → holat keyingi tarmoqqa "oqib" ketadi
```

**Masalalar:** Subsets · Combination Sum · Permutations · Word Search

```csharp
// Grid — tashrifni belgilash va rekursiyadan keyin QAYTARISH
char temp = board[row][col];
board[row][col] = '#';
bool found = /* to'rt yo'nalish */;
board[row][col] = temp;                      // ⚠ QAYTARISH
```

---

# 14.11 · Graphs

```csharp
// BFS — ENG QISQA yo'l (vaznsiz)
while (queue.Count > 0)
{
    int size = queue.Count;
    for (int i = 0; i < size; i++)
    {
        var node = queue.Dequeue();
        foreach (var next in graph.GetValueOrDefault(node, []))
            if (visited.Add(next)) queue.Enqueue(next);   // ⚠ Add bool qaytaradi
    }
    distance++;
}
```

```csharp
// Topologik saralash (Kahn) — inDegree = 0 dan boshlash
foreach (var e in edges) { graph[e[0]].Add(e[1]); inDegree[e[1]]++; }
for (int i = 0; i < n; i++) if (inDegree[i] == 0) queue.Enqueue(i);

while (queue.Count > 0)
{
    var node = queue.Dequeue(); result.Add(node);
    foreach (var next in graph[node]) if (--inDegree[next] == 0) queue.Enqueue(next);
}

return result.Count == n ? [.. result] : [];   // ⚠ bo'sh = TSIKL bor
```

```csharp
// Union-Find — path compression + rank
public int Find(int x) => _parent[x] == x ? x : _parent[x] = Find(_parent[x]);
```

**Masalalar:** Number of Islands · Clone Graph · **Course Schedule** (topologik) ·
Pacific Atlantic · Connected Components

---

# 14.12 · Dynamic Programming

```
   4 QADAM:
   1. HOLAT: dp[i] NIMANI anglatadi?
   2. O'TISH: dp[i] oldingilardan qanday hosil bo'ladi?
   3. Boshlang'ich shart
   4. Hisoblash tartibi

   Yo'l: rekursiya + MEMO (o'ylash oson) → iterativ (tezroq) → xotira O(1)
```

```csharp
// Coin Change — dp[i] = i summani yig'ish uchun MINIMAL tanga soni
var dp = new int[amount + 1];
Array.Fill(dp, amount + 1);              // ⚠ "cheksizlik" o'rniga
dp[0] = 0;

for (int i = 1; i <= amount; i++)
    foreach (var coin in coins)
        if (coin <= i) dp[i] = Math.Min(dp[i], dp[i - coin] + 1);

return dp[amount] > amount ? -1 : dp[amount];
```

```csharp
// House Robber — O(1) xotira
int prev2 = 0, prev1 = 0;
foreach (var num in nums)
    (prev2, prev1) = (prev1, Math.Max(prev1, prev2 + num));
    //                       o'tkazib yuborish / olish
return prev1;
```

**Masalalar:** Climbing Stairs · House Robber · Coin Change · LIS · Unique Paths

---

# 14.13 · Intervals

**Qoida:** deyarli har doim **saralashdan** boshlanadi.

```
   Birlashtirish              → BOSHLANISH bo'yicha saralash
   Maksimal sonini saqlash    → TUGASH bo'yicha saralash (ochko'z)
```

```csharp
// Merge
Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
foreach (var interval in intervals.Skip(1))
{
    var last = result[^1];
    if (interval[0] <= last[1]) last[1] = Math.Max(last[1], interval[1]);
    else result.Add(interval);
}

// Kesishish tekshiruvi
bool Overlaps(int[] a, int[] b) => a[0] < b[1] && b[0] < a[1];
```

```csharp
// ⚠ Non-overlapping — TUGASH bo'yicha saralash (boshlanish emas!)
Array.Sort(intervals, (a, b) => a[1].CompareTo(b[1]));
foreach (var interval in intervals)
    if (interval[0] >= prevEnd) prevEnd = interval[1]; else count++;
```

**Masalalar:** Merge Intervals · Insert Interval · Non-overlapping Intervals

> **Fintech bog'lanishi:** kurs amal qilish davrlari kesishmasligi — bu aynan
> interval masalasi, va u DB'da `EXCLUDE` constraint bilan hal qilinadi (M5.11).

---

# 14.14 · Mavjud yechimlarni qayta ko'rish ⭐

## Muammo

Repozitoriyda **65 ta yechim** bor, lekin bir qismi optimal pattern'ni
ishlatmaydi. Intervyuda «tezroq qila olasizmi?» savoli deyarli har doim beriladi.

```csharp
// dsa/src/Dsa/01-arrays-hashing/LongestConsecutiveSequence.cs — HOZIRGI
var sorted = nums.Distinct().OrderBy(x => x).ToList();   // ⚠ O(n log n)
```

```
   Javob TO'G'RI, lekin:
   · O(n log n) — saralash hisobiga
   · masala aynan O(n) yechimni talab qiladi
   · intervyuchi darhol "tezroq qila olasizmi?" deb so'raydi
```

## Jarayon

```
   Har yechim uchun:
   1. Complexity kommentini YOZING:  // O(n) vaqt, O(n) xotira
   2. Optimal murakkablik bilan SOLISHTIRING
   3. Farq bo'lsa — pattern'ni QAYTA YOZING
   4. TEST qo'shing
```

## Shubhali naqshlar — kodda qidiring

```
   ❌ .OrderBy() / Array.Sort()        → hash bilan O(n) mumkinmi?
   ❌ Ichma-ich sikl                    → hash yoki two pointers?
   ❌ List.Contains() sikl ichida       → HashSet: O(n) → O(1)
   ❌ .Any() / .Where() sikl ichida     → oldindan indeks quring
   ❌ Rekursiya memoizatsiyasiz         → takrorlanuvchi qism masala bormi?
```

## Test holati

```
   Hozir: 65 yechim, 2 test fayli

   Maqsad — har yechimga:
   · 2–3 oddiy holat
   · chegara: bo'sh massiv, bitta element, dublikatlar
   · katta kirish (complexity muhim bo'lsa)
```

```csharp
[Theory]
[InlineData(new[] { 100, 4, 200, 1, 3, 2 }, 4)]
[InlineData(new int[0], 0)]                          // ⚠ bo'sh
[InlineData(new[] { 5 }, 1)]                          // ⚠ bitta element
[InlineData(new[] { 1, 1, 1 }, 1)]                    // ⚠ dublikatlar
public void Solve_ReturnsLongestRun(int[] nums, int expected)
    => Assert.Equal(expected, LongestConsecutiveSequence.Solve(nums));

[Fact]
public void Solve_IsLinear_OnLargeInput()
{
    var nums = Enumerable.Range(0, 100_000).OrderBy(_ => Guid.NewGuid()).ToArray();
    var sw = Stopwatch.StartNew();
    var result = LongestConsecutiveSequence.Solve(nums);
    sw.Stop();

    Assert.Equal(100_000, result);
    Assert.True(sw.ElapsedMilliseconds < 500);       // O(n log n) bo'lsa sekinroq
}
```

## Ustuvorlik

```
   Haftasiga 1 pattern:
   1-hafta:  01-arrays-hashing (7 fayl) — eng ko'p so'raladigan
   2-hafta:  02-two-pointers + 03-sliding-window
   3-hafta:  05-binary-search + 04-stack
   ...
```

---

## M14 — yakuniy tekshiruv ro'yxati

- [ ] Murakkablikni **so'ramasdan** ayta olish (vaqt + xotira + trade-off)
- [ ] «Tezroq qila olasizmi?» savoliga yo'nalish ko'rsatish
- [ ] Sliding window shabloni: kengaytirish har doim, toraytirish shartda
- [ ] Binary search'ning ikki shabloni farqi
- [ ] «Javob bo'yicha binary search» qachon
- [ ] BST'da inorder nima beradi
- [ ] Validate BST'da nega chegaralar uzatiladi
- [ ] Top K uchun nega **min**-heap
- [ ] Backtracking'ning ikki tipik xatosi
- [ ] Topologik saralashda tsiklni aniqlash
- [ ] DP boshlash tartibi (4 qadam)
- [ ] Interval masalalarida saralash mezoni

**Deliverable'lar:**

- [ ] `patterns.md` — har pattern **o'z so'zingiz bilan** (bu fayldan ko'chirmang)
- [ ] Har yechim tepasida complexity kommenti
- [ ] Har yechimga test: 2–3 oddiy + chegara holatlari
- [ ] `LongestConsecutiveSequence` — O(n) ga qayta yozish
- [ ] 65 yechimni qayta ko'rish (haftasiga 1 pattern)
