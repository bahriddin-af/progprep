# M3 · Asinxron va parallel dasturlash

`async`/`await` — .NET intervyusining eng ko'p savol beriladigan mavzularidan biri,
va eng ko'p noto'g'ri tushuniladigani. Bu yerdagi javoblar sizni darhol ajratadi.

| # | Mavzu | P |
|---|---|---|
| [3.1](#31--asyncawait-mexanikasi-) | `async`/`await` mexanikasi ⭐ | P0 |
| [3.2](#32--synchronizationcontext-va-deadlock-) | `SynchronizationContext`, `ConfigureAwait`, deadlock ⭐ | P0 |
| [3.3](#33--thread-pool-va-starvation-) | Thread pool, starvation, `Task.Run` ⭐ | P0 |
| [3.4](#34--whenall-whenany-va-xatolar) | `WhenAll`/`WhenAny`, parallel chaqiruvlar | P1 |
| [3.5](#35--cancellationtoken-) | `CancellationToken` ⭐ | P0 |
| [3.6](#36--iasyncenumerable-va-streaming) | `IAsyncEnumerable`, streaming | P2 |
| [3.7](#37--thread-safety-primitivlari) | Thread-safety: `lock`, `SemaphoreSlim`, `Interlocked` | P1 |
| [3.8](#38--concurrentdictionary-va-channelt) | `ConcurrentDictionary`, `Channel<T>` | P1 |
| [3.9](#39--race-conditionni-kodda-topish) | Race condition'ni kodda topish | P1 |

---

# 3.1 · `async`/`await` mexanikasi ⭐

## Nima va nega

Eng muhim tushuncha: **I/O kutayotgan `await` hech qanday thread band qilmaydi.**

Sinxron kodda thread javob kelguncha o'tirib kutadi — u bloklangan, boshqa ish
qila olmaydi. Async kodda esa thread pool'ga qaytariladi va boshqa so'rovga xizmat
qiladi.

```
   SINXRON: 100 parallel so'rov = 100 BAND thread
   ┌────────────────────────────────────────────────────────┐
   │ Thread 1  ████████ kutyapti (DB javobi) ████████████   │
   │ Thread 2  ████████ kutyapti ████████████████████████   │
   │ ...                                                     │
   │ Thread 100 ███████ kutyapti ███████████████████████    │
   └────────────────────────────────────────────────────────┘
       100 × 1 MB stack = 100 MB, kontekst almashinuvi qimmat

   ASYNC: 100 parallel so'rov = bir necha thread
   ┌────────────────────────────────────────────────────────┐
   │ Thread 1  ██ ██ ██ ██ ██ ██   ← turli so'rovlarga      │
   │ Thread 2  ██ ██ ██ ██ ██ ██     xizmat qiladi          │
   │                                                         │
   │ (kutish paytida thread YO'Q — I/O qurilma darajasida)  │
   └────────────────────────────────────────────────────────┘
```

> **Xulosa:** async server **tezroq emas** — u **ko'proq parallel so'rovni
> ko'taradi**. Bitta so'rov qancha vaqt olgan bo'lsa, shuncha oladi.

## Ichki mexanika — state machine

Kompilyator `async` metodni **holatlar mashinasiga** aylantiradi.

```csharp
public async Task<decimal> GetBalanceAsync(Guid id)
{
    var account = await _db.Accounts.FindAsync(id);    // await nuqtasi 1
    var pending = await _db.GetPendingAsync(id);       // await nuqtasi 2
    return account.Balance - pending;
}
```

Kompilyator taxminan shunday quradi:

```
   ┌─────────────────────────────────────────────────────────┐
   │  struct StateMachine : IAsyncStateMachine               │
   │  {                                                       │
   │      int _state;              // qaysi await'da turibmiz │
   │      Guid id;                 // lokal o'zgaruvchilar    │
   │      Account account;         // await orqali yashaydi   │
   │      TaskAwaiter<Account> _awaiter1;                     │
   │                                                          │
   │      void MoveNext() {                                   │
   │          switch (_state) {                               │
   │              case -1: /* FindAsync boshlanadi */         │
   │              case 0:  /* account tayyor, davom */        │
   │              case 1:  /* pending tayyor, natija */       │
   │          }                                               │
   │      }                                                   │
   │  }                                                       │
   └─────────────────────────────────────────────────────────┘
```

```
   Oqim:

   1. Metod chaqiriladi → state machine yaratiladi
   2. FindAsync boshlanadi → I/O so'rovi OS/drayver darajasiga tushadi
   3. await → metod QAYTADI, thread pool'ga qaytariladi   ← THREAD BO'SHADI
   4. ...boshqa so'rovlarga xizmat qilinadi...
   5. I/O tugaydi → OS completion port orqali xabar beradi
   6. Continuation navbatga qo'yiladi → BIRON thread MoveNext() ni chaqiradi
   7. state = 1 dan davom etadi
```

**Muhim nuans:** 7-qadamdagi thread — 2-qadamdagi thread bilan **bir xil bo'lishi
shart emas**.

## `Task` holatlari

```csharp
var task = DoSomethingAsync();

task.Status        // WaitingForActivation → RanToCompletion / Faulted / Canceled
task.IsCompleted   // tugadimi (muvaffaqiyatli, xato yoki bekor)
task.Exception     // AggregateException (agar Faulted bo'lsa)
```

```
   ⚠ async metod ichidagi exception DARHOL tashlanmaydi.
     U Task ichida "saqlanadi" va faqat await qilinganda qayta tashlanadi.

   var t = FailingAsync();     // exception YO'Q — hali
   await t;                    // MANA endi tashlanadi
```

## Qoidalar

```csharp
// ✅ async metod nomi ...Async bilan tugaydi
public async Task<Payment> ChargeAsync(Money amount, CancellationToken ct)

// ✅ Har async metod CancellationToken qabul qiladi (3.5)

// ❌ async void — faqat event handler'da
public async void Handler(object s, EventArgs e)   // exception ushlanmaydi!

// ✅ Async'ni pastdan yuqorigacha o'tkazing (async all the way)
Controller → Service → Repository → DB
     async     async      async     async
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `async void` | Exception ushlanmaydi, jarayon yiqiladi |
| `.Result` / `.Wait()` | Thread bloklanadi, deadlock (3.2) |
| CPU ishini `async` qilish | Foyda yo'q, faqat qo'shimcha yuk |
| `await` ni unutish | Task «yolg'iz» qoladi, exception yo'qoladi |
| `async` metod ichida sinxron I/O | Thread baribir bloklanadi |
| `Task` ni qaytarish o'rniga `await` qilish (oddiy holatda) | Ortiqcha state machine |

```csharp
// ❌ await unutildi — exception hech qayerda ko'rinmaydi
_ = ProcessPaymentAsync(payment);      // fire-and-forget

// ✅ Ataylab fire-and-forget bo'lsa — xatoni ushlash SHART
_ = ProcessPaymentAsync(payment)
      .ContinueWith(t => logger.LogError(t.Exception, "Fon vazifasi yiqildi"),
                    TaskContinuationOptions.OnlyOnFaulted);
```

```csharp
// Elision — oddiy o'tkazishda async/await shart emas
public Task<Payment> GetAsync(Guid id) => _repo.GetAsync(id);   // ✅ tezroq

// Lekin using yoki try/catch bo'lsa — await SHART
public async Task<Payment> GetAsync(Guid id)
{
    using var scope = _factory.CreateScope();
    return await _repo.GetAsync(id);      // await'siz scope erta yopiladi (M1.8)
}
```

## Fintech konteksti

- To'lov API'sida deyarli hamma ish **I/O**: DB, provayder API, broker. Ya'ni async
  bu yerda tabiiy va majburiy.
- **Async all the way** — bitta sinxron qatlam butun zanjirni bloklaydi.
- Fire-and-forget **ishlatilmaydi**: to'lov hodisasi yo'qolib qolmasligi kerak →
  outbox (M10.3).

## Intervyu savollari

**1. `async` yangi thread yaratadimi?** ⭐

> Yo'q. I/O operatsiyasida thread umuman yo'q: `await` nuqtasida metod qaytadi,
> thread pool'ga qaytariladi, I/O tugagach continuation navbatga tushadi va uni
> **istalgan** thread davom ettiradi.
>
> Thread faqat `Task.Run` bilan CPU ishini ko'chirganda ishlatiladi.
>
> Shuning uchun async server tezroq emas — u bir xil thread soni bilan **ko'proq
> parallel so'rovni** ko'taradi.

**2. Kompilyator `async` metod bilan nima qiladi?**

> Uni **holatlar mashinasiga** aylantiradi. Har `await` nuqtasi — alohida holat;
> `await` orqali yashab qoladigan lokal o'zgaruvchilar state machine maydonlariga
> ko'chadi.
>
> Metod chaqirilganda mashina ishga tushadi, birinchi `await` da metod qaytadi va
> continuation I/O tugaganda `MoveNext()` orqali davom etadi.
>
> Muhim oqibat: `await` dan keyingi kod **boshqa thread'da** bajarilishi mumkin.

**3. `async void` qachon ishlatiladi?**

> Deyarli hech qachon — faqat event handler'da, chunki uning imzosi `void` talab
> qiladi.
>
> Sabab: `async void` metodidagi exception hech qayerda ushlanmaydi va **butun
> jarayonni yiqitadi**. Bundan tashqari uni `await` qilib bo'lmaydi, ya'ni tugashini
> kutib bo'lmaydi.
>
> `async Task` esa exception'ni `Task` ichida saqlaydi va `await` da qayta tashlaydi.

**4. `await` qilinmagan `Task` ga nima bo'ladi?**

> U baribir bajariladi, lekin natijasi va **exception'i hech qayerda ko'rinmaydi** —
> u `Task` ichida qolib ketadi.
>
> .NET Core'da bunday exception jarayonni yiqitmaydi (eski .NET Framework'da
> yiqitardi), lekin xato jimgina yo'qoladi — bu fintech'da qabul qilinmaydi.
>
> Ataylab fire-and-forget qilsam — xatoni ushlash va log qilishni **albatta**
> qo'shaman. Lekin muhim ish uchun umuman fire-and-forget ishlatmayman, outbox
> ishlataman.

## Deliverable

```csharp
public class AsyncBasicsTests
{
    [Fact]
    public async Task Await_DoesNotBlockThread()
    {
        var threadBefore = Environment.CurrentManagedThreadId;
        await Task.Delay(50);
        var threadAfter = Environment.CurrentManagedThreadId;

        // Thread o'zgarishi MUMKIN — bu normal xatti-harakat
        Assert.True(threadAfter > 0);
    }

    [Fact]
    public async Task ExceptionInAsyncMethod_ThrowsOnAwait()
    {
        var task = FailingAsync();                  // exception hali YO'Q
        Assert.True(task.IsFaulted || !task.IsCompleted);

        await Assert.ThrowsAsync<InvalidOperationException>(() => task);
    }

    [Fact]
    public async Task AsyncServer_HandlesManyConcurrentRequests()
    {
        var sw = Stopwatch.StartNew();
        await Task.WhenAll(Enumerable.Range(0, 1000)
                                     .Select(_ => SimulateIoAsync(100)));
        sw.Stop();

        // 1000 × 100 ms ketma-ket = 100 s; async'da ~100–300 ms
        Assert.True(sw.ElapsedMilliseconds < 2000);
    }
}
```

## Xotira kartasi

```
Asosiy       I/O kutayotgan await THREAD BAND QILMAYDI
Xulosa       async tezroq EMAS — ko'proq parallel so'rov ko'taradi
Mexanika     kompilyator → holatlar mashinasi · har await = holat
             lokal o'zgaruvchilar state machine maydoniga ko'chadi
Oqim         await → metod qaytadi → thread bo'shaydi
             I/O tugaydi → continuation navbatga → ISTALGAN thread davom ettiradi
Exception    Task ichida saqlanadi, await qilinganda qayta tashlanadi
async void   FAQAT event handler · exception ushlanmaydi → jarayon yiqiladi
Elision      oddiy o'tkazishda `=> _repo.GetAsync(id)` tezroq
             lekin using/try-catch bo'lsa await SHART
Fintech      async all the way · fire-and-forget YO'Q → outbox
```

---

# 3.2 · `SynchronizationContext` va deadlock ⭐

## Nima va nega

`await` tugagach continuation **qayerda** bajariladi? Javob
`SynchronizationContext` ga bog'liq.

```
   ┌──────────────────────┬────────────────────────────────────────┐
   │  Muhit               │  SynchronizationContext                │
   ├──────────────────────┼────────────────────────────────────────┤
   │  WinForms / WPF      │  BOR — continuation UI thread'da       │
   │  ASP.NET (Framework) │  BOR — so'rov kontekstida              │
   │  ASP.NET Core        │  YO'Q ← muhim                          │
   │  Konsol / xUnit      │  YO'Q (odatda)                         │
   └──────────────────────┴────────────────────────────────────────┘
```

## Klassik deadlock

```
   ┌─────────────────────────────────────────────────────────────┐
   │  UI thread (yoki ASP.NET Framework so'rov thread'i)          │
   │                                                              │
   │  var data = FetchAsync().Result;                             │
   │              │                                               │
   │              ├─► FetchAsync ishga tushdi                     │
   │              │      await httpClient.GetAsync(...)           │
   │              │      → context ESLAB QOLINDI                  │
   │              │                                               │
   │              └─► .Result → thread BLOKLANDI  ◄──────┐        │
   │                                                     │        │
   │  I/O tugadi → continuation shu contextda            │        │
   │               bajarilishi kerak                     │        │
   │               → lekin thread band                   │        │
   │               → KUTADI ────────────────────────────►┘        │
   │                                                              │
   │                    ⛔ O'LIK QULF                             │
   └─────────────────────────────────────────────────────────────┘
```

```csharp
// ❌ Deadlock (ASP.NET Framework / WPF)
public IActionResult Get()
{
    var data = FetchAsync().Result;
    return Ok(data);
}

// ✅ Async all the way
public async Task<IActionResult> Get()
{
    var data = await FetchAsync();
    return Ok(data);
}
```

## `ConfigureAwait(false)`

```csharp
// Kutubxona kodida — contextga qaytish SHART EMAS
await httpClient.GetAsync(url).ConfigureAwait(false);
```

```
   ConfigureAwait(true)  — default
   └─► continuation ASL contextda bajariladi (UI thread, so'rov konteksti)

   ConfigureAwait(false)
   └─► continuation ISTALGAN thread pool thread'ida bajariladi
       · deadlock xavfini yo'qotadi
       · bir oz tezroq (context almashinuvi yo'q)
```

| Kod turi | `ConfigureAwait(false)` |
|---|---|
| **Kutubxona** (NuGet paket) | ✅ Har doim — kim chaqirishini bilmaysiz |
| ASP.NET Core ilova kodi | ⚪ Shart emas (context yo'q) |
| WinForms / WPF kodi | ❌ UI ga tegish kerak bo'lsa yo'q |

> ASP.NET Core'da `SynchronizationContext` yo'q, shuning uchun aynan bu deadlock
> **bo'lmaydi**. Lekin `.Result` baribir thread'ni bloklaydi va thread pool
> starvation beradi (3.3).

## `.Result` ni «xavfsiz» qilish urinishlari

```csharp
// ❌ Bularning hech biri to'g'ri yechim emas
Task.Run(() => FetchAsync()).Result;              // thread'ni behuda sarflaydi
FetchAsync().GetAwaiter().GetResult();            // baribir bloklaydi
JoinableTaskFactory.Run(() => FetchAsync());      // faqat VS SDK uchun

// ✅ Yagona to'g'ri yechim — async all the way
```

**Istisno holatlar** (bloklash muqarrar bo'lgan joylar):

```csharp
// Program.cs — ilova ishga tushishi
public static void Main(string[] args) => MainAsync(args).GetAwaiter().GetResult();

// yoki
public static async Task Main(string[] args) { ... }   // ✅ zamonaviy variant
```

## `AggregateException` farqi

```csharp
try { await task; }
catch (InvalidOperationException ex) { }        // ✅ ASL exception

try { task.Wait(); }
catch (AggregateException ex) {                 // ⚠ o'ralgan
    var real = ex.InnerException;
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `.Result` / `.Wait()` | Deadlock yoki thread starvation |
| `Task.Run(...).Result` | «Yechim» ko'rinadi, aslida thread sarflanadi |
| Kutubxonada `ConfigureAwait` yozmaslik | Chaqiruvchi muhitda deadlock |
| ASP.NET Core'da hamma joyga `ConfigureAwait(false)` | Ortiqcha shovqin, foyda yo'q |
| `AggregateException` ni kutmaslik | `catch` blok ishlamaydi |

## Fintech konteksti

- Eski kod bilan integratsiya — `.Result` ko'p uchraydi. Migratsiya rejasi: eng
  yuqori qatlamdan boshlab `async` ga o'tkazish.
- Kutubxona yozayotgan bo'lsangiz (ichki NuGet paket) — `ConfigureAwait(false)`
  majburiy, chunki uni WPF admin panelida ham ishlatishlari mumkin.

## Intervyu savollari

**1. `.Result` nega deadlock beradi?** ⭐

> `SynchronizationContext` bo'lgan muhitda (WPF, ASP.NET Framework) continuation
> **aynan o'sha thread'da** bajarilishi kerak. Lekin `.Result` shu thread'ni
> bloklab qo'ygan.
>
> Natija: I/O tugadi, continuation navbatda turibdi, lekin uni bajaradigan thread
> band — va u continuation tugashini kutyapti. O'lik qulf.
>
> ASP.NET Core'da context yo'q, shuning uchun aynan bu deadlock bo'lmaydi — lekin
> `.Result` baribir thread'ni bloklaydi va yuqori yukda starvation beradi.

**2. `ConfigureAwait(false)` ni qayerda ishlatasiz?**

> **Kutubxona kodida har doim** — kim va qaysi muhitdan chaqirishini bilmayman,
> shuning uchun contextga qaytishga bog'lanmaslik kerak.
>
> ASP.NET Core ilova kodida — shart emas, chunki `SynchronizationContext` yo'q va
> u hech nima o'zgartirmaydi.
>
> UI kodida — `await` dan keyin UI elementiga tegish kerak bo'lsa, `ConfigureAwait(false)`
> **yozilmaydi**.

**3. `await task` va `task.Wait()` orasida yana qanday farq bor?**

> Bloklashdan tashqari — **exception turi**. `await` asl exception'ni tashlaydi,
> `Wait()` va `.Result` esa uni `AggregateException` ichiga o'raydi.
>
> Ya'ni `catch (InvalidOperationException)` `Wait()` bilan **ishlamaydi** —
> `catch (AggregateException)` yozib, `InnerException` ni ochish kerak.

**4. Eski sinxron kodni qanday async ga o'tkazasiz?**

> **Yuqoridan pastga**: controller/endpoint'dan boshlab, keyin servis, keyin
> repository.
>
> Sabab: pastdan boshlasangiz, oraliqda baribir `.Result` qolib ketadi va foyda
> bo'lmaydi — «async all the way» qoidasi buziladi.
>
> Migratsiya davomida ikkala variant birga yashashi mumkin, lekin bu vaqtinchalik
> holat sifatida rejalashtiriladi.

## Deliverable

```csharp
public class SyncContextTests
{
    [Fact]
    public void Result_ThrowsAggregateException_UnlikeAwait()
    {
        var task = FailingAsync();

        var agg = Assert.Throws<AggregateException>(() => task.Wait());
        Assert.IsType<InvalidOperationException>(agg.InnerException);
    }

    [Fact]
    public async Task Await_ThrowsOriginalException()
        => await Assert.ThrowsAsync<InvalidOperationException>(() => FailingAsync());

    [Fact]
    public void BlockingCall_DeadlocksWithSynchronizationContext()
    {
        var ctx = new SingleThreadSynchronizationContext();
        SynchronizationContext.SetSynchronizationContext(ctx);

        var completed = Task.Run(() => {
            try { _ = DelayAsync().Result; return true; }
            catch { return false; }
        }).Wait(TimeSpan.FromSeconds(2));

        Assert.False(completed);        // ⚠ deadlock ISBOTLANDI
    }
}
```

## Xotira kartasi

```
Context      WPF/WinForms/ASP.NET Framework — BOR · ASP.NET Core — YO'Q
Deadlock     .Result thread'ni bloklaydi → continuation shu thread'ni kutadi
             → o'lik qulf (context bor muhitda)
ASP.NET Core aynan bu deadlock yo'q, LEKIN .Result starvation beradi (3.3)
ConfigureAwait(false)
             kutubxonada HAR DOIM · ilova kodida shart emas · UI'da yo'q
Yechim       async all the way — yuqoridan pastga migratsiya
Istisno      Main() — u yerda bloklash muqarrar (yoki async Main)
Exception    await → asl exception · Wait()/.Result → AggregateException
```

---

# 3.3 · Thread pool va starvation ⭐

## Nima va nega

.NET thread pool — thread'larni qayta ishlatadigan umumiy resurs. ASP.NET Core'da
**har HTTP so'rov** undan thread oladi, `Task.Run`, timer'lar va continuation'lar
ham.

```
   ┌────────────────── THREAD POOL ──────────────────┐
   │                                                  │
   │  Worker thread'lar    ┌──────────────────────┐  │
   │  ████ ████ ████       │  Global navbat       │  │
   │                       │  [ish][ish][ish]...  │  │
   │  I/O completion       └──────────────────────┘  │
   │  ████ ████                                       │
   │                                                  │
   │  Min = Environment.ProcessorCount                │
   │  Max = juda katta (32 767)                       │
   │  O'sish tezligi: ~1–2 thread / SEKUND  ← MUHIM   │
   └──────────────────────────────────────────────────┘
```

## Starvation — mexanizmi

```
   Boshlang'ich: 8 thread (8 yadroli mashina)

   t=0    100 so'rov keldi
          Har biri: var x = SomethingAsync().Result;

   ┌──────────────────────────────────────────────────────────┐
   │ 8 thread ham .Result da BLOKLANGAN                       │
   │ Continuation'lar navbatda — bajaradigan hech kim yo'q    │
   │ Navbat o'sib boradi                                       │
   └──────────────────────────────────────────────────────────┘

   t=1s   pool 1 thread qo'shdi → u ham bloklanadi
   t=2s   yana 1 → u ham
   ...
   t=60s  68 thread — nihoyat ishlay boshladi

   ⚠ Shu 60 soniya davomida tizim DEYARLI JAVOB BERMAYDI.

   Simptom: kechikish keskin oshadi, CPU PAST, navbat o'sadi.
```

## Aniqlash

```bash
dotnet-counters monitor -p <pid> --counters \
    System.Runtime[threadpool-thread-count,threadpool-queue-length,cpu-usage]
```

| Ko'rsatkich | Starvation belgisi |
|---|---|
| `threadpool-queue-length` | Barqaror o'sadi |
| `threadpool-thread-count` | Sekin ko'tariladi (sekundiga 1–2) |
| `cpu-usage` | **Past** — bu asosiy signal |
| Kechikish | Keskin oshadi |

```bash
# Tasdiqlash — ko'p thread kutish holatida
dotnet-stack report -p <pid> | grep -c "SpinWait\|WaitOne\|ManualResetEvent"
```

## Sabablar

```csharp
// 1. .Result / .Wait()  ← eng ko'p uchraydigan
var data = FetchAsync().Result;

// 2. lock ichida uzoq ish
lock (_sync) { var x = DoSlowIo(); }          // boshqa thread'lar kutadi

// 3. Sinxron I/O async metodda
public async Task ProcessAsync() {
    var text = File.ReadAllText(path);         // ❌ bloklaydi
    // ✅ await File.ReadAllTextAsync(path);
}

// 4. Task.Run bilan I/O ni "async qilish"
await Task.Run(() => File.ReadAllText(path));  // ❌ thread band, foyda yo'q

// 5. Parallel.For ichida async
Parallel.For(0, 100, i => DoAsync(i).Wait());  // ❌ falokat
```

## `Task.Run` — qachon to'g'ri

```
   ┌──────────────────────────────────────────────────────────┐
   │  ✅ TO'G'RI                                               │
   │  · Desktop UI'da CPU ishini fon thread'ga ko'chirish      │
   │  · Konsol ilovada parallel CPU hisoblash                  │
   ├──────────────────────────────────────────────────────────┤
   │  ❌ NOTO'G'RI                                             │
   │  · ASP.NET'da "async qilish" uchun                        │
   │    → so'rov allaqachon thread pool thread'ida             │
   │    → Task.Run yana bittasini oladi = ikki barobar zarar   │
   │  · I/O ni o'rash uchun                                    │
   │    → I/O uchun allaqachon async API bor                   │
   └──────────────────────────────────────────────────────────┘
```

```csharp
// ✅ Haqiqiy CPU ishi, ASP.NET'da ham oqlanishi mumkin (kamdan-kam)
public async Task<Report> GenerateAsync(CancellationToken ct)
{
    var data = await _db.GetDataAsync(ct);              // I/O — async
    return await Task.Run(() => HeavyCalculation(data), ct);  // CPU — Task.Run
}
```

## `ThreadPool.SetMinThreads` — yamoq

```csharp
ThreadPool.SetMinThreads(workerThreads: 100, completionPortThreads: 100);
```

```
   Bu starvation'ni YASHIRADI, sabab esa qoladi.
   Vaqtinchalik chora sifatida ishlatiladi (masalan legacy kodni
   migratsiya qilish davomida), doimiy yechim sifatida EMAS.
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `.Result` / `.Wait()` | Starvation |
| ASP.NET'da `Task.Run` bilan «async qilish» | Ikki thread band |
| `lock` ichida I/O | Thread'lar navbatda |
| Sinxron fayl/tarmoq API'lari | Bloklash |
| Starvation'ni `SetMinThreads` bilan «tuzatish» | Sabab qoladi |
| CPU past bo'lgani uchun «yuk yo'q» deb xulosa qilish | Aslida starvation |

## Fintech konteksti

- To'lov tizimida starvation **jimgina falokat**: so'rovlar timeout bo'ladi,
  client'lar qayta yuboradi, yuk yanada oshadi — qor ko'chkisi.
- Shuning uchun **idempotency** (M11.2) va **rate limiting** shu holatda ham
  himoya beradi.
- Monitoringda `threadpool-queue-length` alerti bo'lishi shart.

## Intervyu savollari

**1. Thread pool starvation nima va qanday aniqlaysiz?** ⭐

> Thread pool'dagi thread'lar bloklangan bo'lib, continuation'larni bajaradigan
> hech kim qolmagan holat.
>
> Asosiy simptom: **kechikish keskin oshadi, lekin CPU past**. Bu juftlik deyarli
> har doim starvation'ni bildiradi.
>
> Aniqlash: `dotnet-counters` da `threadpool-queue-length` o'sishi va
> `threadpool-thread-count` ning sekin ko'tarilishi (pool sekundiga faqat 1–2
> thread qo'shadi). Tasdiqlash uchun `dotnet-stack report` — ko'p thread `SpinWait`
> yoki `WaitOne` da turadi.
>
> Sabab deyarli har doim `.Result`, `.Wait()` yoki `lock` ichidagi uzoq ish.

**2. `Task.Run` ni ASP.NET'da qachon ishlatasiz?**

> Faqat **haqiqiy CPU ishi** uchun, va u ham kamdan-kam.
>
> Sabab: so'rov allaqachon thread pool thread'ida ishlayapti. `Task.Run` yana
> bittasini oladi — natijada bitta so'rov ikkita thread band qiladi va throughput
> tushadi.
>
> I/O ni `Task.Run` bilan o'rash esa mutlaqo noto'g'ri: I/O uchun allaqachon
> haqiqiy async API bor va u thread umuman ishlatmaydi.

**3. `SetMinThreads` starvation'ni hal qiladimi?**

> Yo'q, u faqat **simptomni yashiradi**. Pool boshidanoq ko'proq thread bilan
> boshlaydi, ya'ni sekin o'sish muammosi yumshaydi — lekin thread'lar baribir
> bloklanadi.
>
> Uni vaqtinchalik chora sifatida ishlatish mumkin (masalan legacy kodni bosqichma-
> bosqich migratsiya qilish davomida), lekin haqiqiy yechim — bloklashni yo'qotish.

## Deliverable

```csharp
public class ThreadPoolTests
{
    [Fact]
    public async Task BlockingCalls_ExhaustThreadPool()
    {
        ThreadPool.GetMinThreads(out var minWorkers, out _);
        var sw = Stopwatch.StartNew();

        var tasks = Enumerable.Range(0, minWorkers * 4)
            .Select(_ => Task.Run(() => Task.Delay(200).Wait()))   // ❌ bloklash
            .ToArray();
        await Task.WhenAll(tasks);
        sw.Stop();

        // Bloklash tufayli 200 ms emas, sezilarli ko'proq vaqt ketadi
        Assert.True(sw.ElapsedMilliseconds > 400);
    }

    [Fact]
    public async Task AsyncCalls_ScaleWithoutExtraThreads()
    {
        var sw = Stopwatch.StartNew();
        await Task.WhenAll(Enumerable.Range(0, 1000).Select(_ => Task.Delay(200)));
        sw.Stop();

        Assert.True(sw.ElapsedMilliseconds < 600);   // deyarli parallel
    }

    [Fact]
    public async Task QueueLength_IsMonitored()
    {
        var length = ThreadPool.PendingWorkItemCount;
        Assert.True(length < 100);    // production'da bu alert metrikasi
    }
}
```

## Xotira kartasi

```
Thread pool  umumiy resurs · har HTTP so'rov, Task.Run, continuation undan oladi
             Min = ProcessorCount · o'sish ~1–2 thread / SEKUND ← muhim
Starvation   thread'lar bloklangan → continuation bajaruvchisi yo'q
SIMPTOM      kechikish OSHADI + CPU PAST ← bu juftlik asosiy signal
Aniqlash     threadpool-queue-length o'sadi · thread-count sekin ko'tariladi
             dotnet-stack → SpinWait / WaitOne ko'p
Sabablar     .Result · .Wait() · lock ichida I/O · sinxron I/O · Parallel + async
Task.Run     ✅ CPU ishi (desktop, konsol)
             ❌ ASP.NET'da "async qilish" — so'rov allaqachon pool thread'ida
SetMinThreads simptomni YASHIRADI, sabab qoladi → vaqtinchalik chora
```

---

# 3.4 · `WhenAll`, `WhenAny` va xatolar

## Nima va nega

Mustaqil operatsiyalarni **ketma-ket** `await` qilish — eng ko'p uchraydigan
performans yo'qotishi.

```
   ❌ Ketma-ket: 300 + 250 + 200 = 750 ms
   ├──── GetUser (300ms) ────┤
                             ├──── GetBalance (250ms) ────┤
                                                          ├─ GetLimits (200ms) ─┤
   ────────────────────────────────────────────────────────────────────────► 750 ms

   ✅ Parallel: max(300, 250, 200) = 300 ms
   ├──── GetUser (300ms) ────┤
   ├──── GetBalance (250ms) ─┤
   ├─ GetLimits (200ms) ─┤
   ──────────────────────────► 300 ms
```

```csharp
// ❌ Ketma-ket
var user    = await GetUserAsync(id, ct);
var balance = await GetBalanceAsync(id, ct);
var limits  = await GetLimitsAsync(id, ct);

// ✅ Parallel
var userTask    = GetUserAsync(id, ct);
var balanceTask = GetBalanceAsync(id, ct);
var limitsTask  = GetLimitsAsync(id, ct);
await Task.WhenAll(userTask, balanceTask, limitsTask);

var user = await userTask;     // allaqachon tugagan
```

> ⚠ Task'lar **yaratilganda darhol** boshlanadi — `WhenAll` ularni ishga
> tushirmaydi, faqat kutadi.

## Xatolarni to'g'ri yig'ish

```
   Task.WhenAll da BIR NECHTA task xato bersa:

   await Task.WhenAll(t1, t2, t3);
        │
        └─► FAQAT BIRINCHI exception tashlanadi
            qolganlari YO'QOLADI (agar maxsus olinmasa)
```

```csharp
// ✅ Barcha xatolarni olish
var all = Task.WhenAll(t1, t2, t3);
try { await all; }
catch
{
    foreach (var ex in all.Exception!.InnerExceptions)
        logger.LogError(ex, "Parallel vazifa yiqildi");
    throw;
}
```

## `WhenAny` — timeout va poyga

```csharp
// Timeout naqshi (eski uslub)
var work = LongOperationAsync(ct);
var timeout = Task.Delay(TimeSpan.FromSeconds(5), ct);

if (await Task.WhenAny(work, timeout) == timeout)
    throw new TimeoutException();

return await work;

// ✅ Zamonaviy — CancellationTokenSource bilan (3.5)
using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
cts.CancelAfter(TimeSpan.FromSeconds(5));
return await LongOperationAsync(cts.Token);
```

```
   ⚠ WhenAny dan keyin YUTQAZGAN task'lar davom etadi.
     Ular:
     · resurs ushlab turadi
     · exception bersa — "unobserved" bo'ladi
     → ularni bekor qilish yoki kuzatish kerak
```

## Parallellikni cheklash

```csharp
// ❌ 10 000 ta bir vaqtda — DB pool va provayder rate limit yiqiladi
await Task.WhenAll(payments.Select(p => ProcessAsync(p, ct)));

// ✅ .NET 6+ — Parallel.ForEachAsync
await Parallel.ForEachAsync(
    payments,
    new ParallelOptions { MaxDegreeOfParallelism = 10, CancellationToken = ct },
    async (payment, token) => await ProcessAsync(payment, token));

// ✅ SemaphoreSlim bilan (3.7)
using var gate = new SemaphoreSlim(10);
await Task.WhenAll(payments.Select(async p => {
    await gate.WaitAsync(ct);
    try { await ProcessAsync(p, ct); }
    finally { gate.Release(); }
}));
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| Mustaqil chaqiruvlarni ketma-ket `await` | Kechikish yig'iladi |
| `WhenAll` da faqat birinchi xatoni ushlash | Boshqa xatolar yo'qoladi |
| Cheklovsiz parallellik | DB pool tugaydi, rate limit |
| `WhenAny` dan keyin yutqazganni bekor qilmaslik | Resurs sizishi |
| Bir xil `DbContext` bilan parallel so'rov | **Exception** — thread-safe emas |
| Tartib muhim bo'lgan operatsiyalarni parallel qilish | Mantiqiy xato |

```csharp
// ❌ DbContext THREAD-SAFE EMAS
await Task.WhenAll(
    db.Users.FindAsync(id1).AsTask(),
    db.Users.FindAsync(id2).AsTask());   // InvalidOperationException

// ✅ Har vazifa uchun alohida scope
await Task.WhenAll(ids.Select(async id => {
    using var scope = _factory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    return await db.Users.FindAsync(id);
}));
```

## Fintech konteksti

- **To'lov tekshiruvlari** — balans, limit, anti-fraud, KYC holati: bular mustaqil
  va parallel bajarilishi mumkin. Bu kechikishni sezilarli kamaytiradi.
- **Tashqi provayderga parallel so'rov** — rate limit hisobga olinishi shart,
  aks holda 429 va bloklanish.
- **Ledger yozuvlari** — parallel qilinmaydi, ular bitta tranzaksiyada ketma-ket.

## Intervyu savollari

**1. Mustaqil async chaqiruvlarni qanday parallel qilasiz?**

> Task'larni avval yaratib, keyin `Task.WhenAll` bilan kutaman. Task yaratilganda
> darhol boshlanadi, `WhenAll` faqat kutadi.
>
> Bu kechikishni yig'indidan **eng uzunigacha** tushiradi: 300+250+200 = 750 ms
> o'rniga 300 ms.
>
> Lekin ehtiyot: bir xil `DbContext` bilan parallel so'rov qilib bo'lmaydi — u
> thread-safe emas, har vazifa uchun alohida scope kerak.

**2. `WhenAll` da bir nechta task xato bersa nima bo'ladi?**

> `await` faqat **birinchi** exception'ni tashlaydi, qolganlari yo'qoladi.
>
> Hammasini olish uchun `Task` obyektini saqlab, `task.Exception.InnerExceptions`
> ni o'qish kerak.
>
> Fintech'da bu muhim: uchta tashqi chaqiruvdan ikkitasi yiqilsa, ikkalasining ham
> sababini bilish kerak.

**3. Parallellikni nega cheklaysiz?**

> Cheklovsiz parallellik pastdagi resurslarni yiqitadi: DB connection pool tugaydi
> (M5.12), tashqi provayder rate limit beradi, thread pool bosim ostida qoladi.
>
> `Parallel.ForEachAsync` da `MaxDegreeOfParallelism` yoki `SemaphoreSlim` bilan
> cheklayman. Chegara — pastdagi eng zaif resursga qarab tanlanadi.

**4. `WhenAny` dan keyin qolgan task'lar bilan nima qilasiz?**

> Ularni **bekor qilaman** (`CancellationTokenSource`) yoki kamida kuzataman.
>
> Aks holda ular ishlashda davom etadi, resurs ushlaydi, va exception bersa
> «unobserved» bo'lib log'da ko'rinmaydi.
>
> Timeout uchun esa `WhenAny` o'rniga `CancelAfter` bilan bog'langan token
> ishlataman — u toza va yutqazgan task avtomatik bekor bo'ladi.

## Deliverable

```csharp
public class ParallelTests
{
    [Fact]
    public async Task WhenAll_RunsInParallel()
    {
        var sw = Stopwatch.StartNew();
        await Task.WhenAll(Delay(300), Delay(250), Delay(200));
        sw.Stop();

        Assert.InRange(sw.ElapsedMilliseconds, 280, 450);   // ketma-ket 750 bo'lardi
    }

    [Fact]
    public async Task WhenAll_CollectsAllExceptions()
    {
        var all = Task.WhenAll(Fail("a"), Fail("b"), Fail("c"));

        await Assert.ThrowsAnyAsync<Exception>(() => all);
        Assert.Equal(3, all.Exception!.InnerExceptions.Count);
    }

    [Fact]
    public async Task ParallelForEachAsync_RespectsLimit()
    {
        int current = 0, peak = 0;

        await Parallel.ForEachAsync(Enumerable.Range(0, 100),
            new ParallelOptions { MaxDegreeOfParallelism = 5 },
            async (_, ct) => {
                var now = Interlocked.Increment(ref current);
                InterlockedMax(ref peak, now);
                await Task.Delay(10, ct);
                Interlocked.Decrement(ref current);
            });

        Assert.True(peak <= 5);
    }

    [Fact]
    public async Task SharedDbContext_FailsOnParallelUse()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Task.WhenAll(db.Users.CountAsync(), db.Payments.CountAsync()));
    }
}
```

## Xotira kartasi

```
Parallel     mustaqil chaqiruvlarni WhenAll bilan → yig'indi emas, ENG UZUNI
Boshlanish   task YARATILGANDA boshlanadi, WhenAll faqat kutadi
Xatolar      await faqat BIRINCHI exception'ni tashlaydi
             hammasi kerak → task.Exception.InnerExceptions
WhenAny      timeout va poyga uchun · yutqazganni BEKOR QILING
             zamonaviy: CancelAfter + linked token (3.5)
Cheklash     Parallel.ForEachAsync(MaxDegreeOfParallelism) yoki SemaphoreSlim
             sabab: DB pool · provayder rate limit · thread pool bosimi
DbContext    THREAD-SAFE EMAS → har vazifa uchun alohida scope
Fintech      tekshiruvlar (balans/limit/KYC) parallel · ledger yozuvlari KETMA-KET
```

---

# 3.5 · `CancellationToken` ⭐

## Nima va nega

Foydalanuvchi sahifani yopdi, client timeout bo'ldi, ilova to'xtatilyapti — server
esa hali ham ishlab turibdi. `CancellationToken` bu ishni to'xtatish uchun.

```
   Bekor qilish KOOPERATIV:

   ┌──────────────────────────────────────────────────────────┐
   │  CancellationTokenSource (CTS)                           │
   │     │  Cancel() / CancelAfter()                          │
   │     ▼                                                     │
   │  CancellationToken  ──────► metod 1 ──► metod 2 ──► ...  │
   │                              │           │                │
   │                              ▼           ▼                │
   │                        ct.ThrowIfCancellationRequested()  │
   │                        yoki async API'ga uzatiladi        │
   └──────────────────────────────────────────────────────────┘

   ⚠ Token hech narsani MAJBURAN to'xtatmaydi.
     Kod uni TEKSHIRISHI yoki UZATISHI kerak.
```

## ASP.NET Core'da

```csharp
[HttpGet("payments")]
public async Task<IActionResult> GetAsync(CancellationToken ct)   // avtomatik keladi
{
    // client ulanishni uzsa — ct bekor bo'ladi
    var payments = await _db.Payments.ToListAsync(ct);
    return Ok(payments);
}
```

```csharp
// Har qatlamga UZATILADI — bu asosiy qoida
public async Task<Payment> ChargeAsync(Money amount, CancellationToken ct)
{
    var account = await _repo.GetAsync(accountId, ct);        // ✅
    await _provider.ChargeAsync(amount, ct);                  // ✅
    await _db.SaveChangesAsync(ct);                           // ✅
}
```

## Timeout va bog'langan token

```csharp
// Ilova to'xtashi + so'rov bekor qilinishi + timeout — hammasi birga
using var cts = CancellationTokenSource.CreateLinkedTokenSource(
    requestAborted, applicationStopping);
cts.CancelAfter(TimeSpan.FromSeconds(30));

await _provider.ChargeAsync(amount, cts.Token);
```

```csharp
// CPU siklida tekshirish
foreach (var row in millionRows)
{
    ct.ThrowIfCancellationRequested();     // OperationCanceledException
    Process(row);
}

// yoki yumshoqroq
if (ct.IsCancellationRequested) return partialResult;
```

## Bekor qilishni **qachon** hurmat qilmaslik kerak

```
   ⚠ FINTECH'DAGI ENG MUHIM NUANS

   Pul yechildi → client uzildi → ct bekor bo'ldi
                                   │
                                   ▼
   ❌ Ledger yozuvini yozishni to'xtatish
      → pul yechilgan, lekin yozuv yo'q → NOMUVOFIQLIK

   ✅ Kritik qism CancellationToken.None bilan tugatiladi
```

```csharp
public async Task<Result> ProcessAsync(Payment payment, CancellationToken ct)
{
    // Tayyorgarlik — bekor qilinishi MUMKIN
    var account = await _repo.GetAsync(payment.AccountId, ct);
    if (!Validate(account, payment)) return Result.Fail("...");

    ct.ThrowIfCancellationRequested();     // oxirgi tekshiruv nuqtasi

    // ⚠ Bu yerdan keyin — bekor qilinmaydi
    using var tx = await _db.Database.BeginTransactionAsync(CancellationToken.None);
    await WriteLedgerEntriesAsync(payment, CancellationToken.None);
    await tx.CommitAsync(CancellationToken.None);

    return Result.Ok();
}
```

## `OperationCanceledException` ni to'g'ri ishlash

```csharp
try { await ProcessAsync(ct); }
catch (OperationCanceledException) when (ct.IsCancellationRequested)
{
    // ✅ Kutilgan bekor qilish — bu XATO EMAS
    logger.LogInformation("So'rov bekor qilindi");
    return;
}
catch (OperationCanceledException ex)
{
    // ⚠ Boshqa sabab — masalan ichki timeout
    logger.LogWarning(ex, "Ichki timeout");
    throw;
}
```

```
   ⚠ Bekor qilishni xato sifatida log qilmang —
     dashboard "xato foizi" ko'rsatkichi buziladi.
```

## Graceful shutdown

```csharp
public class OutboxRelay(IHostApplicationLifetime lifetime) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var batch = await LoadBatchAsync(stoppingToken);

            foreach (var msg in batch)
            {
                // Boshlangan xabarni TUGATAMIZ — yarim ish qoldirmaymiz
                await PublishAsync(msg, CancellationToken.None);
                await MarkPublishedAsync(msg, CancellationToken.None);
            }

            await Task.Delay(500, stoppingToken);
        }
    }
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `ct` ni uzatmaslik | Bekor qilish ishlamaydi |
| `CancellationToken.None` ni hamma joyda ishlatish | Bekor qilish umuman yo'q |
| Kritik yozuvni bekor qilish | Ma'lumot nomuvofiqligi |
| `OperationCanceledException` ni xato deb log qilish | Alert shovqini |
| `CTS` ni `Dispose` qilmaslik | Timer sizishi |
| Faqat `IsCancellationRequested` ni tekshirish | Async API'ga uzatilmaydi |

## Fintech konteksti

- **Chegara aniq belgilanadi:** «bu nuqtagacha bekor qilish mumkin, bundan keyin
  yo'q». Odatda bu nuqta — pul harakatining boshlanishi.
- **Provayderga so'rov** timeout bilan chegaralanadi, lekin timeout = `unknown`
  holat (M11.5), muvaffaqiyatsizlik emas.
- **Graceful shutdown** — Kubernetes `SIGTERM` yuboradi, ilova boshlangan ishni
  tugatishi va yangisini olmasligi kerak.

## Intervyu savollari

**1. `CancellationToken` qanday ishlaydi?**

> Bu **kooperativ** mexanizm: token hech narsani majburan to'xtatmaydi. Kod uni
> `ThrowIfCancellationRequested()` bilan tekshirishi yoki pastdagi async API'ga
> uzatishi kerak.
>
> ASP.NET Core controller'ga uni avtomatik beradi va client ulanishni uzganda
> bekor qiladi.
>
> Asosiy qoida — uni **har async metodga uzatish**, aks holda zanjir uziladi.

**2. Bekor qilishni har doim hurmat qilish kerakmi?** ⭐

> Yo'q, va fintech'da bu muhim nuans.
>
> Pul yechilgandan keyin client uzilib ketsa, ledger yozuvini yozishni to'xtatish
> **nomuvofiqlik** yaratadi — pul ketdi, yozuv yo'q.
>
> Shuning uchun men aniq **chegara** belgilayman: tayyorgarlik va validatsiya
> bekor qilinishi mumkin, pul harakati boshlangandan keyin esa kritik qism
> `CancellationToken.None` bilan tugatiladi.

**3. `OperationCanceledException` ni qanday log qilasiz?**

> Kutilgan bekor qilish — bu **xato emas**, shuning uchun `Information` darajasida
> log qilaman va exception counter'iga qo'shmayman.
>
> Aks holda dashboard'dagi «xato foizi» buziladi va real muammolar shovqin ichida
> yo'qoladi.
>
> Filter bilan ajrataman: `catch (OperationCanceledException) when
> (ct.IsCancellationRequested)` — bu kutilgan; boshqa holat esa ichki timeout va u
> ogohlantirishga arziydi.

**4. Graceful shutdown'ni qanday amalga oshirasiz?**

> `BackgroundService` `stoppingToken` oladi. Men uni **yangi ish olmaslik** uchun
> ishlataman, lekin **boshlangan ishni tugataman** — buning uchun ichkarida
> `CancellationToken.None`.
>
> Kubernetes `SIGTERM` yuborib `terminationGracePeriodSeconds` kutadi; bu muddat
> eng uzun operatsiyadan uzunroq bo'lishi kerak.

## Deliverable

```csharp
public class CancellationTests
{
    [Fact]
    public async Task Cancellation_PropagatesThroughLayers()
    {
        using var cts = new CancellationTokenSource();
        var task = service.LongOperationAsync(cts.Token);

        cts.Cancel();
        await Assert.ThrowsAsync<OperationCanceledException>(() => task);
    }

    [Fact]
    public async Task LedgerWrite_CompletesEvenWhenCancelled()
    {
        using var cts = new CancellationTokenSource();
        var task = service.ProcessPaymentAsync(payment, cts.Token);

        await Task.Delay(10);
        cts.Cancel();                                  // pul harakati boshlangan

        await task;
        Assert.Equal(0, await LedgerDelta());          // yozuvlar TO'LIQ
    }

    [Fact]
    public async Task Timeout_UsesLinkedToken()
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(default);
        cts.CancelAfter(TimeSpan.FromMilliseconds(100));

        await Assert.ThrowsAsync<OperationCanceledException>(
            () => Task.Delay(5000, cts.Token));
    }

    [Fact]
    public async Task BackgroundService_FinishesCurrentBatch()
    {
        var relay = new OutboxRelay(factory);
        var run = relay.StartAsync(CancellationToken.None);
        await Task.Delay(50);

        await relay.StopAsync(CancellationToken.None);

        Assert.Equal(0, await CountPartiallyProcessedMessages());
    }
}
```

## Xotira kartasi

```
Mexanizm     KOOPERATIV — token hech narsani majburan to'xtatmaydi
Qoida        har async metodga UZATING · ASP.NET controller'ga avtomatik keladi
Tekshirish   ct.ThrowIfCancellationRequested() · yoki async API'ga uzatish
Timeout      CreateLinkedTokenSource + CancelAfter (WhenAny'dan yaxshiroq)
FINTECH ⭐    aniq CHEGARA: tayyorgarlik bekor qilinadi
             pul harakati boshlangach → CancellationToken.None bilan TUGATILADI
Exception    OperationCanceledException kutilgan bo'lsa — XATO EMAS
             Information darajasida log · exception counter'ga qo'shilmaydi
Shutdown     stoppingToken = yangi ish olmaslik
             boshlangan ish None bilan tugatiladi
```

---

# 3.6 · `IAsyncEnumerable` va streaming

## Nima va nega

Million qatorli natijani `List<T>` ga yig'ish — xotirani portlatadi. Streaming
esa elementlarni **kelib tushgani sari** qayta ishlaydi.

```
   ❌ ToListAsync — hammasi xotiraga
   ┌──────────────────────────────────────────────┐
   │  DB ──────► [1 mln qator] ──────► xotira     │
   │                                    500 MB     │
   │  ⚠ birinchi element ham HAMMASI kelguncha    │
   │    kutiladi                                   │
   └──────────────────────────────────────────────┘

   ✅ IAsyncEnumerable — oqim
   ┌──────────────────────────────────────────────┐
   │  DB ──► [1] ──► ishlov ──► chiqish            │
   │     ──► [2] ──► ishlov ──► chiqish            │
   │     ──► [3] ──► ...                           │
   │                                                │
   │  Xotira: bir necha qator                      │
   │  Birinchi natija: DARHOL                      │
   └──────────────────────────────────────────────┘
```

## Kod

```csharp
public async IAsyncEnumerable<LedgerEntry> StreamEntriesAsync(
    Guid accountId,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await using var conn = new NpgsqlConnection(_cs);
    await conn.OpenAsync(ct);

    await using var cmd = new NpgsqlCommand(
        "SELECT id, amount_minor, direction FROM ledger_entries " +
        "WHERE account_id = @id ORDER BY created_at", conn);
    cmd.Parameters.AddWithValue("id", accountId);

    await using var reader = await cmd.ExecuteReaderAsync(ct);
    while (await reader.ReadAsync(ct))
        yield return Map(reader);          // ← elementlar birma-bir chiqadi
}

// Iste'mol
await foreach (var entry in StreamEntriesAsync(id, ct))
    await writer.WriteLineAsync(Format(entry));
```

> `[EnumeratorCancellation]` atributi **majburiy** — usiz `WithCancellation` ishlamaydi.

## EF Core va ASP.NET Core

```csharp
// EF Core streaming
await foreach (var payment in db.Payments.Where(p => p.UserId == id).AsAsyncEnumerable())
{
    Process(payment);
}

// ASP.NET Core — javob oqim sifatida yuboriladi
[HttpGet("export")]
public async IAsyncEnumerable<PaymentDto> ExportAsync(
    [EnumeratorCancellation] CancellationToken ct)
{
    await foreach (var p in _service.StreamAsync(ct))
        yield return Map(p);
}
```

## Foydali operatorlar

```csharp
// System.Linq.Async paketi
await foreach (var x in source.Where(p => p.Minor > 0)
                              .Select(Map)
                              .Take(100)
                              .WithCancellation(ct)) { }

// .NET 6+ — batching uchun Chunk yo'q, qo'lda yoziladi
static async IAsyncEnumerable<List<T>> Batch<T>(
    IAsyncEnumerable<T> source, int size,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    var batch = new List<T>(size);
    await foreach (var item in source.WithCancellation(ct))
    {
        batch.Add(item);
        if (batch.Count == size) { yield return batch; batch = new List<T>(size); }
    }
    if (batch.Count > 0) yield return batch;
}
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `[EnumeratorCancellation]` ni unutish | Bekor qilish ishlamaydi |
| Streaming ichida `ToList()` | Butun foyda yo'qoladi |
| Uzoq streaming davomida ochiq tranzaksiya | Qulf va bloat (M5.7) |
| Streaming natijasini bir necha marta enumerate qilish | So'rov qayta bajariladi |
| `yield return` ni `lock` ichida | Deadlock xavfi |
| Xatoni oqim o'rtasida qaytarish | HTTP status allaqachon 200 yuborilgan |

```
   ⚠ HTTP streaming'da javob KODI birinchi element bilan yuboriladi.
     Oqim o'rtasida xato chiqsa — client 200 OK olgan, keyin ulanish uziladi.
     → Validatsiyani oqim BOSHLANISHIDAN OLDIN bajaring.
```

## Fintech konteksti

- **Bank fayllari eksporti** (kunlik tranzaksiyalar, hisobotlar) — millionlab qator,
  streaming majburiy. LOH'ga tushmaydi (M2.2).
- **Reconciliation** — provayder faylini oqim sifatida o'qib solishtirish.
- Streaming davomida **tranzaksiya ochiq qolmasin** — bu MVCC bloat beradi.

## Intervyu savollari

**1. `IAsyncEnumerable` qachon kerak?**

> Katta yoki noma'lum hajmdagi natija bilan ishlaganda: eksport, hisobot, log
> o'qish, tashqi API'dan sahifalab olish.
>
> Ikki foyda: xotira barqaror qoladi (hammasi bir vaqtda yuklanmaydi) va birinchi
> natija **darhol** chiqadi — client kutmaydi.
>
> Fintech'da tipik holat — kunlik tranzaksiyalar faylini generatsiya qilish.

**2. `IEnumerable` va `IAsyncEnumerable` farqi?**

> `IEnumerable` da `MoveNext()` sinxron — element kutish kerak bo'lsa thread
> bloklanadi.
>
> `IAsyncEnumerable` da `MoveNextAsync()` — har element uchun `await` qilish
> mumkin, ya'ni DB yoki tarmoqdan oqim o'qishda thread band bo'lmaydi.

**3. Streaming'da qanday tuzoqlar bor?**

> Uchtasi asosiy:
> 1. `[EnumeratorCancellation]` unutilsa bekor qilish ishlamaydi.
> 2. Uzoq streaming davomida tranzaksiya ochiq qolsa — qulflar ushlanadi va
>    PostgreSQL'da bloat paydo bo'ladi.
> 3. HTTP streaming'da javob kodi birinchi element bilan yuboriladi — o'rtada xato
>    chiqsa client allaqachon `200 OK` olgan bo'ladi.
>
> Uchinchisi uchun: barcha validatsiyani oqim boshlanishidan **oldin** bajaraman.

## Deliverable

```csharp
public class StreamingTests
{
    [Fact]
    public async Task Streaming_KeepsMemoryFlat()
    {
        await SeedEntries(1_000_000);
        var before = GC.GetTotalMemory(true);

        long count = 0;
        await foreach (var _ in service.StreamEntriesAsync(accountId))
            count++;

        var after = GC.GetTotalMemory(true);
        Assert.Equal(1_000_000, count);
        Assert.True(after - before < 50 * 1024 * 1024);     // < 50 MB
    }

    [Fact]
    public async Task Streaming_RespectsCancellation()
    {
        using var cts = new CancellationTokenSource();
        int seen = 0;

        await Assert.ThrowsAsync<OperationCanceledException>(async () => {
            await foreach (var _ in service.StreamEntriesAsync(accountId, cts.Token))
                if (++seen == 10) cts.Cancel();
        });

        Assert.Equal(10, seen);
    }

    [Fact]
    public async Task FirstResult_ArrivesImmediately()
    {
        var sw = Stopwatch.StartNew();
        await foreach (var _ in service.StreamEntriesAsync(accountId)) break;
        sw.Stop();

        Assert.True(sw.ElapsedMilliseconds < 200);   // ToListAsync sekundlar olardi
    }
}
```

## Xotira kartasi

```
Nega         katta natija · xotira barqaror · birinchi element DARHOL
Sintaksis    async IAsyncEnumerable<T> + yield return + await foreach
MAJBURIY     [EnumeratorCancellation] — usiz WithCancellation ishlamaydi
EF Core      .AsAsyncEnumerable()
ASP.NET      IAsyncEnumerable qaytarilsa javob OQIM sifatida ketadi
Tuzoqlar     ichida ToList() → foyda yo'q
             uzoq streaming + ochiq tranzaksiya → qulf va bloat (M5.7)
             HTTP'da status BIRINCHI element bilan ketadi
             → validatsiya oqimdan OLDIN
Fintech      bank fayllari eksporti · reconciliation · LOH'ga tushmaydi
```

---

# 3.7 · Thread-safety primitivlari

## Nima va nega

Bir necha thread bitta ma'lumotga tegsa va kamida bittasi yozsa — **sinxronizatsiya
kerak**. Aks holda natija bashorat qilinmaydi.

```
   Ikkita thread:  counter++

   counter++ aslida UCH amal:
   ┌──────────────────────────┐
   │ 1. read  counter → 5     │
   │ 2. add   5 + 1  = 6      │
   │ 3. write counter = 6     │
   └──────────────────────────┘

   T1: read(5)              write(6)
   T2:        read(5)                write(6)
                                     ▲
                            Natija: 6, kutilgan 7 — BITTA YO'QOLDI
```

## Vositalar

| Primitiv | Qachon | Async'da |
|---|---|---|
| `lock` (`Monitor`) | Qisqa sinxron kritik uchastka | ❌ `await` mumkin emas |
| `SemaphoreSlim` | Async kritik uchastka, parallellik cheklovi | ✅ `WaitAsync` |
| `Interlocked` | Oddiy atomik amallar (hisoblagich) | ✅ |
| `ReaderWriterLockSlim` | Ko'p o'qish, kam yozish | ❌ |
| `volatile` | Faqat ko'rinuvchanlik | ✅ |
| `Lazy<T>` | Bir marta ishga tushirish | ✅ (`LazyThreadSafetyMode`) |

## `lock`

```csharp
private readonly object _sync = new();      // ✅ maxsus obyekt

public void Add(decimal amount)
{
    lock (_sync) { _total += amount; }      // qisqa va tez
}
```

```csharp
// ❌ Bularni lock qilmang
lock (this)                  // tashqi kod ham shu obyektni lock qilishi mumkin
lock (typeof(MyClass))       // butun ilova bo'ylab umumiy
lock ("literal")             // satrlar intern qilinadi — global lock!

// ❌ lock ichida await MUMKIN EMAS (kompilyatsiya xatosi)
lock (_sync) { await SomethingAsync(); }

// ❌ lock ichida uzoq ish — starvation (3.3)
lock (_sync) { var data = LoadFromDb(); }
```

## `SemaphoreSlim` — async uchun

```csharp
private readonly SemaphoreSlim _gate = new(1, 1);   // 1 = mutex kabi

public async Task UpdateAsync(CancellationToken ct)
{
    await _gate.WaitAsync(ct);
    try { await _repo.SaveAsync(ct); }
    finally { _gate.Release(); }             // ⚠ finally MAJBURIY
}

// Parallellikni cheklash uchun (3.4)
private readonly SemaphoreSlim _limit = new(10, 10);
```

## `Interlocked` — qulfsiz atomik amallar

```csharp
private long _processed;

Interlocked.Increment(ref _processed);
Interlocked.Add(ref _total, amount);
Interlocked.Exchange(ref _current, newValue);

// Compare-and-swap — qulfsiz algoritmlar asosi
long original, updated;
do
{
    original = _balance;
    updated  = original - amount;
    if (updated < 0) return false;
}
while (Interlocked.CompareExchange(ref _balance, updated, original) != original);
```

> `Interlocked` `lock` dan **ancha tez**, lekin faqat oddiy amallar uchun.

## `volatile` — nima qiladi va qilmaydi

```csharp
private volatile bool _stopped;      // ✅ ko'rinuvchanlik kafolatlanadi

// ❌ volatile ATOMIKLIK bermaydi
private volatile int _counter;
_counter++;                          // baribir race condition!
```

```
   volatile:  boshqa thread qiymatni KO'RADI (kesh va reordering muammosi)
   atomiklik: amal BO'LINMAS bo'ladi

   Bayroq uchun → volatile yetadi
   Hisoblagich uchun → Interlocked kerak
```

## Async va lock birga

```csharp
// ❌ Bu deadlock va starvation manbai
lock (_sync) { _cache[key] = LoadAsync(key).Result; }

// ✅ SemaphoreSlim
await _gate.WaitAsync(ct);
try { _cache[key] = await LoadAsync(key, ct); }
finally { _gate.Release(); }

// ✅ Yoki umuman qulfsiz — ConcurrentDictionary (3.8)
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `lock (this)` / `lock (typeof(X))` / `lock ("str")` | Tashqi kod bilan to'qnashuv |
| `lock` ichida I/O yoki uzoq ish | Thread starvation |
| `SemaphoreSlim.Release()` ni `finally`siz | Semafor abadiy band |
| `volatile` ni atomiklik deb o'ylash | Race condition qoladi |
| Har joyga `lock` qo'yish | Throughput qulaydi |
| Ikki lock'ni har xil tartibda olish | Deadlock (M5.6 bilan bir xil g'oya) |

## Fintech konteksti

- **Balans hisobi — DB'da**, xotirada emas. Ilova darajasidagi `lock` bir necha
  instance'da **ishlamaydi**. Bu eng ko'p uchraydigan noto'g'ri tushuncha.
- Xotiradagi qulflar faqat **lokal** holat uchun: kesh, hisoblagich, rate limiter.
- Bir necha instance uchun **distributed lock** (Redis) yoki DB qulfi (M5.4) kerak.

## Intervyu savollari

**1. `lock` va `SemaphoreSlim` orasidagi farq?**

> `lock` — sinxron va thread'ga bog'langan (reentrant), lekin ichida `await` qilib
> **bo'lmaydi**.
>
> `SemaphoreSlim` `WaitAsync` beradi, ya'ni async kodda ishlaydi va bir vaqtda
> nechta thread kirishini cheklash imkonini beradi (`new SemaphoreSlim(10)`).
>
> Narxi: `SemaphoreSlim` reentrant emas — bir xil thread ikki marta kirsa deadlock
> bo'ladi. Va `Release()` `finally` da bo'lishi shart.

**2. `volatile` nima qiladi?**

> Faqat **ko'rinuvchanlik** kafolatlaydi: bir thread yozgan qiymatni boshqasi
> ko'radi (kompilyator va protsessor keshi/reordering'idan himoya).
>
> U **atomiklik bermaydi**: `volatile int _counter; _counter++` baribir race
> condition.
>
> Bayroq uchun `volatile` yetadi, hisoblagich uchun `Interlocked` kerak.

**3. `Interlocked` qachon `lock` dan yaxshiroq?**

> Oddiy atomik amallar uchun — inkrement, qo'shish, almashtirish. U qulfsiz
> (lock-free) va `lock` dan ancha tez, chunki protsessor darajasidagi atomik
> instruksiyaga tushadi.
>
> `CompareExchange` bilan qulfsiz algoritm ham yozish mumkin, lekin murakkab
> mantiq uchun `lock` yoki `SemaphoreSlim` o'qilishi ravshanroq.

**4. Balansni `lock` bilan himoya qilsa bo'ladimi?** ⭐

> Yo'q — va bu muhim savol.
>
> `lock` faqat **bitta jarayon** ichida ishlaydi. Ilova ikkita instance'da
> ishlayotgan bo'lsa (Kubernetes'da bu odatiy holat), ikkala jarayon ham o'z
> lock'ini oladi va hech qanday himoya bo'lmaydi.
>
> Balans uchun himoya **DB darajasida**: atomik `UPDATE`, `FOR UPDATE` yoki
> optimistic locking (M5.3–5.5).
>
> Xotiradagi qulflar faqat lokal holat uchun — kesh, hisoblagich.

## Deliverable

```csharp
public class ThreadSafetyTests
{
    [Fact]
    public async Task UnsynchronizedIncrement_LosesUpdates()
    {
        var counter = new UnsafeCounter();
        await Task.WhenAll(Enumerable.Range(0, 100)
            .Select(_ => Task.Run(() => { for (int i = 0; i < 1000; i++) counter.Add(); })));

        Assert.NotEqual(100_000, counter.Value);      // ⚠ yo'qotish ISBOTLANDI
    }

    [Fact]
    public async Task Interlocked_IsCorrect()
    {
        long counter = 0;
        await Task.WhenAll(Enumerable.Range(0, 100)
            .Select(_ => Task.Run(() => {
                for (int i = 0; i < 1000; i++) Interlocked.Increment(ref counter);
            })));

        Assert.Equal(100_000, counter);
    }

    [Fact]
    public async Task SemaphoreSlim_LimitsConcurrency()
    {
        var gate = new SemaphoreSlim(3);
        int current = 0, peak = 0;

        await Task.WhenAll(Enumerable.Range(0, 50).Select(async _ => {
            await gate.WaitAsync();
            try {
                var now = Interlocked.Increment(ref current);
                InterlockedMax(ref peak, now);
                await Task.Delay(20);
                Interlocked.Decrement(ref current);
            }
            finally { gate.Release(); }
        }));

        Assert.True(peak <= 3);
    }

    [Fact]
    public async Task InMemoryLock_DoesNotProtectAcrossInstances()
    {
        // Ikki alohida "instance" — bir xil DB
        var a = new BalanceServiceWithLock(db1);
        var b = new BalanceServiceWithLock(db2);

        await Task.WhenAll(a.WithdrawAsync(id, 80_000), b.WithdrawAsync(id, 80_000));

        Assert.NotEqual(20_000, await GetBalance(id));   // ⚠ lock YORDAM BERMADI
    }
}
```

## Xotira kartasi

```
Muammo       counter++ = 3 amal → race condition
lock         qisqa SINXRON kritik uchastka · ichida await MUMKIN EMAS
             lock(this)/typeof/satr — HECH QACHON (global to'qnashuv)
SemaphoreSlim async uchun (WaitAsync) · parallellik cheklovi
             reentrant EMAS · Release() finally'da MAJBURIY
Interlocked  atomik va QULFSIZ · Increment/Add/Exchange/CompareExchange
volatile     faqat KO'RINUVCHANLIK · atomiklik BERMAYDI
             bayroq → volatile · hisoblagich → Interlocked
FINTECH ⭐    lock faqat BITTA JARAYON ichida ishlaydi
             balans himoyasi DB darajasida (atomik UPDATE / FOR UPDATE)
             xotira qulflari faqat lokal holat uchun (kesh, hisoblagich)
```

---

# 3.8 · `ConcurrentDictionary` va `Channel<T>`

## Nima va nega

Qulf yozish o'rniga — **tayyor thread-safe kolleksiyalar**. Ular ko'pincha tezroq
va xatoga kam moyil.

| Kolleksiya | Qachon |
|---|---|
| `ConcurrentDictionary<K,V>` | Kesh, ro'yxatga olish |
| `ConcurrentQueue<T>` | FIFO navbat |
| `ConcurrentBag<T>` | Tartibsiz to'plam (kam ishlatiladi) |
| `Channel<T>` | **Producer/consumer — async oqim** |
| `BlockingCollection<T>` | Sinxron producer/consumer (eskirgan) |
| `ImmutableList<T>` | Kam o'zgaradigan ulashilgan ma'lumot |

## `ConcurrentDictionary` tuzoqlari

```csharp
var cache = new ConcurrentDictionary<string, Rate>();

// ✅ Atomik olish-yoki-qo'shish
var rate = cache.GetOrAdd(key, k => LoadRate(k));

// ⚠ MUHIM: valueFactory BIR NECHTA marta chaqirilishi mumkin!
//   (natijadan faqat bittasi saqlanadi)
//   → factory yon ta'sirsiz va arzon bo'lishi kerak
```

```csharp
// ❌ Qimmat yoki yon ta'sirli factory
cache.GetOrAdd(key, k => CallExternalApi(k));    // bir necha marta chaqirilishi mumkin

// ✅ Lazy bilan — factory aynan bir marta bajariladi
var lazyCache = new ConcurrentDictionary<string, Lazy<Rate>>();
var rate = lazyCache.GetOrAdd(key,
    k => new Lazy<Rate>(() => LoadRate(k), LazyThreadSafetyMode.ExecutionAndPublication)).Value;

// ✅ Async uchun
var asyncCache = new ConcurrentDictionary<string, Task<Rate>>();
var rate = await asyncCache.GetOrAdd(key, k => LoadRateAsync(k));
```

```csharp
// ⚠ Count va enumeratsiya — SNAPSHOT emas, "taxminiy"
if (cache.Count > 100) { }        // o'qigan zahoti eskiradi

// ⚠ Bir necha amal atomik EMAS
if (!cache.ContainsKey(k)) cache.TryAdd(k, v);    // ❌ orasida boshqa thread kiradi
cache.TryAdd(k, v);                                // ✅ bitta atomik amal
```

## `Channel<T>` — zamonaviy producer/consumer

```
   ┌──────────┐   yozadi    ┌─────────────┐   o'qiydi   ┌──────────┐
   │ Producer │ ──────────► │  Channel<T> │ ──────────► │ Consumer │
   └──────────┘             │  (bounded)  │             └──────────┘
                            └─────────────┘
                                  │
                            To'lib qolsa:
                            · Wait  — producer kutadi (backpressure) ✅
                            · DropOldest / DropWrite — eskisini tashlaydi
```

```csharp
var channel = Channel.CreateBounded<Payment>(new BoundedChannelOptions(1000)
{
    FullMode = BoundedChannelFullMode.Wait,     // backpressure
    SingleReader = false,
    SingleWriter = false
});

// Producer
await channel.Writer.WriteAsync(payment, ct);
channel.Writer.Complete();                       // tugadi deb belgilash

// Consumer
await foreach (var payment in channel.Reader.ReadAllAsync(ct))
    await ProcessAsync(payment, ct);
```

> **Nega `Channel` `BlockingCollection` dan yaxshi:** u to'liq async — to'lib
> qolganda thread bloklanmaydi, `WriteAsync` shunchaki kutadi.

## Bounded vs Unbounded

```
   Unbounded  → cheksiz o'sadi → OutOfMemory xavfi
   Bounded    → backpressure: producer sekinlashadi ✅

   Fintech'da HAR DOIM bounded:
   producer (HTTP so'rovlar) consumer'dan tez bo'lsa,
   navbat cheksiz o'ssa — ilova yiqiladi.
```

## Bir necha consumer

```csharp
var consumers = Enumerable.Range(0, 4).Select(_ => Task.Run(async () => {
    await foreach (var item in channel.Reader.ReadAllAsync(ct))
        await ProcessAsync(item, ct);
}));

await Task.WhenAll(consumers);
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| `GetOrAdd` da qimmat/yon ta'sirli factory | Bir necha marta chaqiriladi |
| `ContainsKey` + `TryAdd` | Atomik emas — race condition |
| `Count` ga tayanib qaror qabul qilish | Qiymat darhol eskiradi |
| Unbounded channel | Xotira o'sadi, OOM |
| `Writer.Complete()` chaqirmaslik | Consumer abadiy kutadi |
| `ConcurrentDictionary` ni cheksiz o'stirish | Xotira sizishi (M2.3) |

## Fintech konteksti

- **Outbox relay** — `Channel` bilan: bitta reader DB'dan o'qiydi, bir necha
  consumer brokerga yuboradi.
- **Kurs keshi** — `ConcurrentDictionary` + TTL, yoki `IMemoryCache` (u ichida shuni
  ishlatadi).
- **Backpressure majburiy**: to'lov oqimi cho'qqisida navbat cheksiz o'ssa, ilova
  xotira tugashidan yiqiladi va **hamma** so'rov yo'qoladi.

## Intervyu savollari

**1. `ConcurrentDictionary.GetOrAdd` da qanday tuzoq bor?**

> `valueFactory` **bir necha marta chaqirilishi mumkin** — bir vaqtda kelgan
> thread'lar hammasi factory'ni bajaradi, lekin natijadan faqat bittasi saqlanadi.
>
> Agar factory qimmat bo'lsa yoki yon ta'siri bo'lsa (tashqi API chaqiruvi) — bu
> muammo.
>
> Yechim: qiymat sifatida `Lazy<T>` yoki `Task<T>` saqlash — shunda haqiqiy ish
> aynan bir marta bajariladi.

**2. `Channel<T>` nima uchun kerak?**

> Async producer/consumer uchun. `BlockingCollection` dan farqi — u to'liq async:
> navbat to'lib qolganda thread **bloklanmaydi**, `WriteAsync` kutadi.
>
> Va u **backpressure** beradi: bounded channel to'lganda producer sekinlashadi.
> Bu tizimni himoya qiladi.

**3. Bounded va unbounded channel — qaysi birini tanlaysiz?**

> Fintech'da **har doim bounded**.
>
> Unbounded channel cheksiz o'sadi: producer consumer'dan tez bo'lsa navbat
> xotirani yeydi va ilova `OutOfMemoryException` bilan yiqiladi — natijada
> **hamma** so'rov yo'qoladi.
>
> Bounded'da esa producer sekinlashadi (backpressure) yoki aniq strategiya bo'yicha
> eskisi tashlanadi — va bu **ongli qaror**.

**4. Thread-safe kolleksiya ishlatsam sinxronizatsiya kerak emasmi?**

> Har **alohida amal** atomik, lekin **amallar ketma-ketligi** emas.
>
> `if (!dict.ContainsKey(k)) dict.TryAdd(k, v);` — ikki amal orasida boshqa thread
> kirishi mumkin. Shuning uchun `TryAdd` yoki `GetOrAdd` kabi **bitta** atomik
> metod ishlatiladi.
>
> Va `Count` hamda enumeratsiya — snapshot emas, taxminiy qiymat.

## Deliverable

```csharp
public class ConcurrentCollectionTests
{
    [Fact]
    public async Task GetOrAdd_MayInvokeFactoryMultipleTimes()
    {
        var dict = new ConcurrentDictionary<string, int>();
        int calls = 0;

        await Task.WhenAll(Enumerable.Range(0, 100).Select(_ => Task.Run(() =>
            dict.GetOrAdd("key", _ => { Interlocked.Increment(ref calls); return 1; }))));

        Assert.True(calls >= 1);      // ⚠ 1 dan KATTA bo'lishi mumkin
        Assert.Single(dict);          // lekin natija bitta
    }

    [Fact]
    public async Task LazyWrapper_InvokesFactoryExactlyOnce()
    {
        var dict = new ConcurrentDictionary<string, Lazy<int>>();
        int calls = 0;

        await Task.WhenAll(Enumerable.Range(0, 100).Select(_ => Task.Run(() =>
            dict.GetOrAdd("key", _ => new Lazy<int>(() => {
                Interlocked.Increment(ref calls); return 1;
            }, LazyThreadSafetyMode.ExecutionAndPublication)).Value)));

        Assert.Equal(1, calls);       // ✅ aynan bir marta
    }

    [Fact]
    public async Task BoundedChannel_AppliesBackpressure()
    {
        var channel = Channel.CreateBounded<int>(new BoundedChannelOptions(10)
            { FullMode = BoundedChannelFullMode.Wait });

        var producer = Task.Run(async () => {
            for (int i = 0; i < 100; i++) await channel.Writer.WriteAsync(i);
            channel.Writer.Complete();
        });

        await Task.Delay(100);
        Assert.False(producer.IsCompleted);        // producer KUTYAPTI

        var count = 0;
        await foreach (var _ in channel.Reader.ReadAllAsync()) count++;
        await producer;

        Assert.Equal(100, count);
    }
}
```

## Xotira kartasi

```
Tayyor       ConcurrentDictionary · ConcurrentQueue · Channel<T> · Immutable*
GetOrAdd     ⚠ valueFactory BIR NECHTA marta chaqirilishi mumkin
             yechim: Lazy<T> yoki Task<T> saqlash
Atomiklik    har AMAL atomik, amallar KETMA-KETLIGI emas
             ContainsKey + TryAdd ❌ → bitta TryAdd/GetOrAdd ✅
Count        snapshot EMAS — taxminiy, darhol eskiradi
Channel<T>   async producer/consumer · BlockingCollection'dan yaxshi (bloklamaydi)
Bounded      BACKPRESSURE beradi → fintech'da HAR DOIM bounded
Unbounded    cheksiz o'sadi → OOM → hamma so'rov yo'qoladi
Complete()   chaqirilmasa consumer abadiy kutadi
```

---

# 3.9 · Race condition'ni kodda topish

## Nima va nega

Race condition — natija **bajarilish tartibiga** bog'liq bo'lgan holat. Ular
tasodifiy takrorlanadi va shuning uchun eng qiyin buglar.

```
   Race condition uchun 3 shart:

   1. Ikki yoki undan ko'p bajarilish oqimi (thread / so'rov / instance)
   2. UMUMIY holat (xotira / DB qatori / fayl)
   3. Kamida bittasi YOZADI
```

## Kod ko'rib chiqishda qidiriladigan naqshlar

```csharp
// 1. Check-then-act  ← eng ko'p uchraydigan
if (!dict.ContainsKey(key)) dict.Add(key, value);
if (account.Balance >= amount) account.Balance -= amount;
if (!File.Exists(path)) File.Create(path);

// 2. Read-modify-write
_counter++;
_total += amount;
list[0] = list[0] + 1;

// 3. Lazy initialization
if (_instance == null) _instance = new Service();

// 4. Kesh yangilash
var cached = _cache.Get(key);
if (cached == null) { cached = Load(); _cache.Set(key, cached); }

// 5. Mutable static / singleton holati
private static List<string> _log = new();
```

## Uch darajadagi race

```
   ┌─ 1. THREAD darajasi (bitta jarayon) ──────────────────┐
   │  Yechim: lock · Interlocked · Concurrent* (3.7, 3.8)  │
   └────────────────────────────────────────────────────────┘

   ┌─ 2. SO'ROV darajasi (bir necha instance) ─────────────┐
   │  ⚠ lock ISHLAMAYDI — har jarayonda o'z lock'i         │
   │  Yechim: DB qulfi (M5.4) · atomik UPDATE (M5.3)       │
   │          distributed lock (Redis)                      │
   └────────────────────────────────────────────────────────┘

   ┌─ 3. TIZIM darajasi (servislar aro) ───────────────────┐
   │  Yechim: idempotentlik (M10.4) · saga (M10.6)         │
   └────────────────────────────────────────────────────────┘
```

> **Fintech'dagi asosiy xato:** 2-darajadagi muammoni 1-darajadagi vosita bilan
> yechishga urinish. `lock` bilan balans himoyasi — Kubernetes'da ikki pod bo'lsa
> **ishlamaydi**.

## Testda race'ni topish

```csharp
// Parallel stress test — eng amaliy usul
[Fact]
public async Task ConcurrentWithdrawals_NeverGoNegative()
{
    var id = await SeedAccount(balance: 100_000);

    await Task.WhenAll(Enumerable.Range(0, 100)
        .Select(_ => service.WithdrawAsync(id, 10_000)));

    var balance = await GetBalance(id);
    Assert.True(balance >= 0);                 // invariant
    Assert.Equal(0, balance % 10_000);         // butun yechishlar
}
```

```csharp
// Ataylab tor oyna yaratish — race'ni ehtimolini oshirish
public async Task<bool> WithdrawWithDelayAsync(Guid id, long amount)
{
    var balance = await GetBalanceAsync(id);
    await Task.Delay(50);                      // ⚠ FAQAT testda: oynani kengaytirish
    if (balance < amount) return false;
    await SetBalanceAsync(id, balance - amount);
    return true;
}
```

## Aniqlash vositalari

```bash
# Ko'p marta ishga tushirish — beqaror testni topish
dotnet test --filter Concurrency -- xUnit.MaxParallelThreads=8
for i in {1..50}; do dotnet test --filter ConcurrentWithdrawals || break; done

# Production'da: DB tomonidan aniqlash
```

```sql
-- Invariantni davriy tekshirish — race'ning ISHONCHLI detektori
SELECT account_id, balance_minor,
       (SELECT sum(CASE direction WHEN 'CR' THEN amount_minor
                                  ELSE -amount_minor END)
        FROM ledger_entries e WHERE e.account_id = a.id) AS computed
FROM   accounts a
WHERE  balance_minor <> (SELECT ...);       -- farq bo'lsa → race bo'lgan
```

## Tipik xatolar

| Xato | Natija |
|---|---|
| «Testda takrorlanmadi, demak yo'q» | Race tasodifiy — 1000 marta ishlating |
| `lock` bilan tarqoq muammoni yechish | Bir instance'da ishlaydi, prod'da yo'q |
| `Thread.Sleep` bilan «tuzatish» | Ehtimolni kamaytiradi, yo'q qilmaydi |
| Invariant tekshiruvi yo'q | Race jimgina davom etadi |
| Faqat happy path testi | Race hech qachon topilmaydi |

## Fintech konteksti

Fintech'dagi klassik race'lar va ularning yechimi:

| Race | Daraja | Yechim |
|---|---|---|
| Lost update (balans) | 2 | Atomik `UPDATE` / `FOR UPDATE` (M5.3) |
| Limit oshib ketishi | 2 | `daily_limits` qatori + atomik `UPDATE` (M4.9) |
| Ikki marta to'lov | 3 | Idempotency key (M11.2) |
| Dublikat xabar | 3 | Idempotent consumer (M10.4) |
| Kesh stampede | 1 | `Lazy<T>` / `SemaphoreSlim` (3.8) |

## Intervyu savollari

**1. Race condition'ni kod ko'rib chiqishda qanday topasiz?**

> Uchta shartni qidiraman: bir necha bajarilish oqimi, umumiy holat, va kamida
> bittasi yozadi.
>
> Amaliy naqshlar: **check-then-act** (`if (balance >= amount)` keyin ayirish),
> **read-modify-write** (`counter++`), lazy initialization, kesh yangilash.
>
> Va eng muhimi — **qaysi darajada** ekanini aniqlayman: bitta jarayon ichidami,
> bir necha instance orasidami, yoki servislar aromi. Yechim shunga bog'liq.

**2. `lock` qo'ysam yetarli emasmi?**

> Faqat **bitta jarayon** ichida. Ilova Kubernetes'da ikki pod bilan ishlayotgan
> bo'lsa, har pod o'z lock'ini oladi va himoya yo'q.
>
> Bu fintech'dagi eng ko'p uchraydigan noto'g'ri tushuncha: balansni ilova
> darajasida `lock` bilan himoya qilishga urinish.
>
> To'g'ri yechim — himoyani **DB darajasiga** tushirish: atomik `UPDATE`,
> `FOR UPDATE`, yoki optimistic locking.

**3. Race'ni testda qanday topasiz?**

> Parallel stress test: 100 ta bir vaqtdagi operatsiya va **invariant tekshiruvi**
> (balans manfiy bo'lmasin, yig'indi to'g'ri bo'lsin).
>
> Race tasodifiy takrorlanadi, shuning uchun testni bir necha marta ishga
> tushiraman. Va ataylab `Task.Delay` bilan oynani kengaytirib, ehtimolni
> oshiraman — bu faqat test uchun.
>
> Production'da esa eng ishonchli detektor — **invariant tekshiruvi**: ledger
> yig'indisi va keshlangan balans mos kelmasa, demak race bo'lgan.

**4. Race topildi. Qanday tuzatasiz?**

> Avval darajani aniqlayman, keyin mos vositani tanlayman:
> - **Thread darajasi** → `Interlocked` yoki `Concurrent*` kolleksiya.
> - **Instance darajasi** → DB qulfi yoki atomik `UPDATE`.
> - **Tizim darajasi** → idempotentlik yoki saga.
>
> Va tuzatishdan keyin **test yozaman** — u bug'ni isbotlagan bo'lishi kerak, aks
> holda tuzatilganiga ishonch yo'q.

## Deliverable

```csharp
public class RaceConditionTests
{
    [Fact]
    public async Task CheckThenAct_AllowsOverdraft()
    {
        var id = await SeedAccount(100_000);

        await Task.WhenAll(Enumerable.Range(0, 10)
            .Select(_ => naiveService.WithdrawAsync(id, 80_000)));

        var balance = await GetBalance(id);
        Assert.True(balance < 0);            // ⚠ bug ISBOTLANDI
    }

    [Fact]
    public async Task AtomicUpdate_NeverGoesNegative()
    {
        var id = await SeedAccount(100_000);

        var results = await Task.WhenAll(Enumerable.Range(0, 10)
            .Select(_ => safeService.WithdrawAsync(id, 80_000)));

        Assert.Equal(1, results.Count(r => r.IsSuccess));
        Assert.Equal(20_000, await GetBalance(id));
    }

    [Fact]
    public async Task InMemoryLock_FailsAcrossInstances()
    {
        var instanceA = new LockBasedService(NewDbContext());
        var instanceB = new LockBasedService(NewDbContext());
        var id = await SeedAccount(100_000);

        await Task.WhenAll(instanceA.WithdrawAsync(id, 80_000),
                           instanceB.WithdrawAsync(id, 80_000));

        Assert.NotEqual(20_000, await GetBalance(id));   // lock yordam bermadi
    }

    [Fact]
    public async Task Invariant_HoldsUnderStress()
    {
        await Task.WhenAll(Enumerable.Range(0, 500).Select(async i => {
            if (i % 2 == 0) await service.DepositAsync(id, 1_000);
            else            await service.WithdrawAsync(id, 1_000);
        }));

        Assert.Equal(await ComputeFromLedger(id), await GetCachedBalance(id));
    }
}
```

## Xotira kartasi

```
3 shart      bir necha oqim + UMUMIY holat + kamida bittasi YOZADI
Naqshlar     check-then-act · read-modify-write · lazy init · kesh yangilash
3 daraja     1. thread → lock/Interlocked/Concurrent*
             2. INSTANCE → DB qulfi / atomik UPDATE / distributed lock
             3. tizim → idempotentlik / saga
ASOSIY XATO  2-darajali muammoni lock bilan yechishga urinish
             (Kubernetes'da 2 pod → lock ISHLAMAYDI)
Topish       parallel stress test + INVARIANT tekshiruvi
             testda Task.Delay bilan oynani kengaytirish
             1000 marta ishga tushirish — race tasodifiy
Production   invariant job: ledger yig'indisi vs keshlangan balans
Tuzatgach    bug'ni ISBOTLAGAN test yozing
```

---

## M3 — yakuniy tekshiruv ro'yxati

Kodsiz, og'zaki javob bera olsangiz — modul yopilgan:

- [ ] `async` thread yaratadimi va nima uchun server «tezroq emas»
- [ ] Kompilyator `async` metod bilan nima qiladi
- [ ] `async void` nega xavfli
- [ ] `.Result` nega deadlock beradi va ASP.NET Core'da nima o'zgaradi
- [ ] `ConfigureAwait(false)` qayerda kerak
- [ ] Thread pool starvation simptomi va aniqlash usuli
- [ ] `Task.Run` ASP.NET'da qachon oqlanadi
- [ ] `WhenAll` da bir necha xato bo'lsa nima bo'ladi
- [ ] Bekor qilishni qachon **hurmat qilmaslik** kerak
- [ ] `IAsyncEnumerable` da `[EnumeratorCancellation]` nega kerak
- [ ] `volatile` nima qiladi va nima qilmaydi
- [ ] `GetOrAdd` da qanday tuzoq bor
- [ ] Nega `lock` bilan balansni himoya qilib bo'lmaydi

**Deliverable'lar:**

- [ ] `AsyncBasicsTests` — exception `await` da tashlanishi, 1000 parallel so'rov
- [ ] `SyncContextTests` — deadlock isboti, `AggregateException` farqi
- [ ] `ThreadPoolTests` — bloklash vs async miqyoslanishi
- [ ] `ParallelTests` — `WhenAll` tezligi, barcha xatolarni yig'ish, `DbContext` bugi
- [ ] `CancellationTests` — ledger yozuvi bekor qilinmasligi
- [ ] `StreamingTests` — xotira barqarorligi, birinchi natija tezligi
- [ ] `ThreadSafetyTests` — yo'qolgan inkrementlar, `lock` instance'lar aro ishlamasligi
- [ ] `RaceConditionTests` — check-then-act bugini isbotlash va tuzatish
