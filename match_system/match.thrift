//match_service：指定了 Python 代码生成时使用的命名空间名称。在 Python 中，命名空间通常对应于包（package）或模块（module）的层次结构。
// 生成一个名称为match_service的文件夹，可作为模块在其他文件中引入
namespace py match_service 

service Match {
    i32 add_player(1: i32 score, 2: string uuid, 3: string username, 4: string photo, 5: string channel_name),
}
