namespace Dsa.Trees;

/// <summary>
/// Ikkilik daraxt tuguni (LeetCode TreeNode). Bu — masala emas, umumiy tuzilma.
/// </summary>
public class TreeNode
{
    public int Val;
    public TreeNode? Left;
    public TreeNode? Right;

    public TreeNode(int val = 0, TreeNode? left = null, TreeNode? right = null)
    {
        Val = val;
        Left = left;
        Right = right;
    }
}
