namespace Dsa.ArraysHashing;

/// <summary>
/// LeetCode 238. Product of Array Except Self
/// Pattern: Arrays & Hashing — prefix / suffix product, bo'lishsiz.
/// TODO: yech — Time: ?, Space: ?
/// </summary>
public static class ProductExceptSelf
{
    public static int[] Solve(int[] nums)
    {
        int n = nums.Length;
        int[] answer = new int[n];

        answer[0] = 1;
        for (int i = 1; i < n; i++)
        {
            answer[i] = answer[i - 1] * nums[i - 1];
        }

        int right = 1;
        for (int i = n - 1; i >= 0; i--)
        {
            answer[i] *= right;
            right *= nums[i];
        }

        return answer;
    }
}
