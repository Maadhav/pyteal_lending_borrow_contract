from tkinter import Misc
from pyteal import *


# This is an defi lending pool contract in pyteal.
def approval_program():

    @Subroutine(TealType.none)
    def sendAlgo(to: Expr, amount: Expr) -> Expr:
        return Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.amount: amount,
                    TxnField.receiver: to,
                }
            ),
            InnerTxnBuilder.Submit(),
        )

    # This is the global state of the contract.
    market_size = Bytes("market_size")
    deposit_apy = Bytes("deposit_apy")
    borrow_apy = Bytes("borrow_apy")

    # This is the local state of the contract.
    total_deposits = Bytes("total_deposits")
    total_borrows = Bytes("total_borrows")

    # on_create
    on_create = Seq(
        App.globalPut(market_size, Int(0)),
        App.globalPut(deposit_apy, Int(50000)),
        App.globalPut(borrow_apy, Int(100000)),
        Approve()
    )

    # on_lend
    on_lend_txn_index = Txn.group_index() - Int(1)
    latest_market_size = App.globalGet(market_size)
    latest_total_deposits = App.localGet(
        Gtxn[on_lend_txn_index].sender(), total_deposits)
    on_lend = Seq(
        Assert(
            And(
                Gtxn[on_lend_txn_index].type_enum() == TxnType.Payment,
                Gtxn[on_lend_txn_index].sender() == Txn.sender(),
                Gtxn[on_lend_txn_index].receiver()
                == Global.current_application_address(),
                Gtxn[on_lend_txn_index].amount() >= Global.min_txn_fee(),
            )
        ),
        App.globalPut(market_size, latest_market_size +
                      Gtxn[on_lend_txn_index].amount()),
        App.localPut(Gtxn[on_lend_txn_index].sender(),
                     total_deposits, Gtxn[on_lend_txn_index].amount() + latest_total_deposits),
        Approve(),
    )

    # on_withdraw
    amount = Btoi(Txn.application_args[1])
    latest_total_deposits = App.localGet(
        Txn.sender(), total_deposits)
    latest_deposit_apy = App.globalGet(deposit_apy)
    total_amt = Add(amount, Div(amount, latest_deposit_apy))
    on_withdraw = Seq(
        If(
            And(
                amount <= latest_total_deposits,
                amount >= Global.min_txn_fee(),
            )
        ).Then(
            Seq(
                sendAlgo(Txn.sender(), total_amt),

                App.globalPut(market_size, latest_market_size - total_amt),
                App.localPut(Txn.sender(),
                             total_deposits,  latest_total_deposits - amount),
                Approve(),
            ),
        ),
        Reject(),
    )

    # on_borrow
    amount = Btoi(Txn.application_args[1])
    latest_total_borrows = App.localGet(
        Txn.sender(), total_borrows)
    on_borrow = Seq(
        If(
            And(
                amount <= latest_market_size,
                amount >= Global.min_txn_fee(),
            ),
        ).Then(
            Seq(
                sendAlgo(Txn.sender(), amount),
                App.globalPut(market_size, latest_market_size -
                              amount),
                App.localPut(Txn.sender(), total_borrows,
                             amount + latest_total_borrows),
                Approve(),
            ),
        ),
        Reject(),
    )

    # on_repay
    on_repay_txn_index = Txn.group_index() - Int(1)
    latest_total_borrows = App.localGet(
        Gtxn[on_repay_txn_index].sender(), total_borrows)
    latest_borrow_apy = App.globalGet(deposit_apy)
    total_amt = Minus(Gtxn[on_repay_txn_index].amount(), Div(Gtxn[on_repay_txn_index].amount(), latest_borrow_apy))
    latest_market_size = App.globalGet(market_size)
    on_repay = Seq(
        Assert(
            And(
                Gtxn[on_repay_txn_index].type_enum() == TxnType.Payment,
                Gtxn[on_repay_txn_index].sender() == Txn.sender(),
                Gtxn[on_repay_txn_index].receiver()
                == Global.current_application_address(),
                Gtxn[on_repay_txn_index].amount() >= Global.min_txn_fee(),
                total_amt <= latest_total_borrows,
            )
        ),
        App.globalPut(market_size, latest_market_size + Gtxn[on_repay_txn_index].amount()),
        App.localPut(Gtxn[on_repay_txn_index].sender(),
                     total_borrows,  latest_total_borrows - total_amt),
        Approve(),
    )

    on_call_method = Txn.application_args[0]
    on_call = Cond(
        [on_call_method == Bytes("lend"), on_lend],
        [on_call_method == Bytes("withdraw"), on_withdraw],
        [on_call_method == Bytes("borrow"), on_borrow],
        [on_call_method == Bytes("repay"), on_repay],
    )

    return Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, on_call],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [
            Or(
                Txn.on_completion() == OnComplete.DeleteApplication,
                Txn.on_completion() == OnComplete.CloseOut,
                Txn.on_completion() == OnComplete.UpdateApplication,
            ),
            Reject(),
        ],
    )


def clear_state_program():
    return Approve()


if __name__ == "__main__":
    with open("approval_program.teal", "w") as f:
        compiled = compileTeal(
            approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)

    with open("clear_state_program.teal", "w") as f:
        compiled = compileTeal(clear_state_program(),
                               mode=Mode.Application, version=5)
        f.write(compiled)
