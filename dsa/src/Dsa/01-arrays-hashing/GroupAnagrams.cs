namespace Dsa.ArraysHashing;

/// <summary>
/// LeetCode 49. Group Anagrams
/// </summary>
public static class GroupAnagrams
{
    public static IList<IList<string>> Solve(string[] strs)
    {
        var anagrams = new Dictionary<string, IList<string>>();

        foreach (var str in strs)
        {
            var sorted = new string(str.OrderBy(x => x).ToArray());

            if (anagrams.TryGetValue(sorted, out var list))
            {
                list.Add(str);
            }
            else
            {
                anagrams[sorted] = new List<string> { str };
            }
        }

        return anagrams.Values.ToList();
    }
}
