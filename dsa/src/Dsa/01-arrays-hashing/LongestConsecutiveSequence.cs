namespace Dsa.ArraysHashing;

/// <summary>
/// LeetCode 128. Longest Consecutive Sequence
/// </summary>
public static class LongestConsecutiveSequence
{
    public static int Solve(int[] nums)
    {
        if (nums.Length == 0)
            return 0;

        var sorted = nums.Distinct().OrderBy(x => x).ToList();

        int longest = 1;
        int current = 1;

        for (int i = 1; i < sorted.Count; i++)
        {
            if (sorted[i] == sorted[i - 1] + 1)
            {
                current++;
            }
            else
            {
                longest = Math.Max(longest, current);
                current = 1;
            }
        }

        return Math.Max(longest, current);
    }
}
