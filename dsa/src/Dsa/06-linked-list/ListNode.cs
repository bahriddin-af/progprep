namespace Dsa.LinkedList;

/// <summary>
/// Bir bog'lamli ro'yxat tuguni (LeetCode ListNode). Bu — masala emas, umumiy tuzilma.
/// </summary>
public class ListNode
{
    public int Val;
    public ListNode? Next;

    public ListNode(int val = 0, ListNode? next = null)
    {
        Val = val;
        Next = next;
    }
}
