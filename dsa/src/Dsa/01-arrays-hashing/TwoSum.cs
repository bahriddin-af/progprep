namespace Dsa.ArraysHashing;

/// <summary>
/// LeetCode 1. Two Sum
/// Pattern: hash map bilan bir marta o'tish.
/// Time: O(n), Space: O(n)
/// </summary>
public static class TwoSum
{
    public static int[] Solve(int[] nums, int target)
    {
        var seen = new Dictionary<int, int>();

        for (var i = 0; i < nums.Length; i++)
        {
            var need = target - nums[i];

            if (seen.TryGetValue(need, out var j))
                return [j, i];

            seen[nums[i]] = i;
        }

        return [];
    }
}
