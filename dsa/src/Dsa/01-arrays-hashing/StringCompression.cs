namespace Dsa.ArraysHashing;

/// <summary>
/// LeetCode 443. String Compression
/// Pattern: Two Pointers / string encoding — takror harflarni "harf+son" ko'rinishida in-place yoz.
/// (271 Encode/Decode Strings premium bo'lgani uchun bepul ekvivalent.)
/// TODO: yech — Time: ?, Space: ?
/// </summary>
public static class StringCompression
{
    public static int Solve(char[] chars)
    {
        Dictionary<char, int> dict = new Dictionary<char, int>();
        foreach (char c in chars)
        {
            if (dict.ContainsKey(c))
                dict[c]++;
            else
                dict[c] = 1;
        }

        return dict.Count() * 2;
    }
}
