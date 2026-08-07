import '../App.css'
import Snake from './Snake'

export default function GameBoard(){
    return (
        <div>
            <h2>Game board</h2>
            <div className="gameboard">
                <Snake/>
            </div>

        </div>
    )
}
